#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>
#include <process.h>
#include <time.h>

// Global control
volatile int running = 1;
char *log_file = NULL;

// Configuration
typedef struct {
    char *game;
    double threshold;
    int fps;
    char *pipe_path;
    int debug;
} config_t;

// Function prototypes
BOOL WINAPI console_handler(DWORD ctrl_type);
void log_command(const char *command, const char *action);
void execute_game_command(const char *command, char *response);
void print_usage(const char *prog_name);
config_t parse_arguments(int argc, char *argv[]);

// Console handler
BOOL WINAPI console_handler(DWORD ctrl_type) {
    if (ctrl_type == CTRL_C_EVENT || ctrl_type == CTRL_CLOSE_EVENT) {
        printf("\n[CONTROLLER] Shutdown signal received\n");
        running = 0;
        return TRUE;
    }
    return FALSE;
}

// Log command
void log_command(const char *command, const char *action) {
    time_t now;
    time(&now);
    struct tm *tm_info = localtime(&now);
    char timestamp[64];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", tm_info);
    
    if (log_file) {
        FILE *log = fopen(log_file, "a");
        if (log) {
            fprintf(log, "[%s] %s -> %s\n", timestamp, command, action);
            fclose(log);
        }
    }
    
    printf("[%s] %s -> %s\n", timestamp, command, action);
}

// Execute command and prepare response
void execute_game_command(const char *command, char *response) {
    if (strcmp(command, "UP") == 0) {
        log_command(command, "executed");
        sprintf(response, "OK:UP");
        printf("[GAME] Moving UP\n");
    } else if (strcmp(command, "DOWN") == 0) {
        log_command(command, "executed");
        sprintf(response, "OK:DOWN");
        printf("[GAME] Moving DOWN\n");
    } else if (strcmp(command, "LEFT") == 0) {
        log_command(command, "executed");
        sprintf(response, "OK:LEFT");
        printf("[GAME] Moving LEFT\n");
    } else if (strcmp(command, "RIGHT") == 0) {
        log_command(command, "executed");
        sprintf(response, "OK:RIGHT");
        printf("[GAME] Moving RIGHT\n");
    } else {
        log_command(command, "unknown");
        sprintf(response, "ERROR:UNKNOWN");
        printf("[GAME] Unknown command: %s\n", command);
    }
}

// Parse arguments
config_t parse_arguments(int argc, char *argv[]) {
    config_t config = {
        .game = "default",
        .threshold = 0.5,
        .fps = 30,
        .pipe_path = "\\\\.\\pipe\\vcgi_pipe",
        .debug = 0
    };
    
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-g") == 0 && i + 1 < argc) {
            config.game = argv[++i];
        } else if (strcmp(argv[i], "-t") == 0 && i + 1 < argc) {
            config.threshold = atof(argv[++i]);
        } else if (strcmp(argv[i], "-f") == 0 && i + 1 < argc) {
            config.fps = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-p") == 0 && i + 1 < argc) {
            config.pipe_path = argv[++i];
        } else if (strcmp(argv[i], "-d") == 0) {
            config.debug = 1;
        } else if (strcmp(argv[i], "-l") == 0 && i + 1 < argc) {
            log_file = argv[++i];
        } else if (strcmp(argv[i], "-h") == 0) {
            print_usage(argv[0]);
            exit(0);
        }
    }
    
    return config;
}

// Print usage
void print_usage(const char *prog_name) {
    printf("Motion Controller - Bidirectional Version\n");
    printf("Usage: %s [options]\n", prog_name);
    printf("Options:\n");
    printf("  -g <game>     Game name (default: default)\n");
    printf("  -t <threshold> Threshold (default: 0.5)\n");
    printf("  -f <fps>      FPS (default: 30)\n");
    printf("  -p <pipe>     Pipe path (default: \\\\.\\pipe\\vcgi_pipe)\n");
    printf("  -d            Debug mode\n");
    printf("  -l <logfile>  Log file\n");
    printf("  -h            Show help\n");
}

int main(int argc, char *argv[]) {
    config_t config = parse_arguments(argc, argv);
    
    printf("=== Motion Controller (Bidirectional) ===\n");
    printf("Game: %s\n", config.game);
    printf("Pipe: %s\n", config.pipe_path);
    printf("Debug: %s\n", config.debug ? "ON" : "OFF");
    printf("=========================================\n\n");
    
    SetConsoleCtrlHandler(console_handler, TRUE);
    
    printf("[CONTROLLER] Starting bidirectional server...\n");
    printf("[CONTROLLER] Press Ctrl+C to stop\n\n");
    
    while (running) {
        HANDLE pipe_handle = INVALID_HANDLE_VALUE;
        
        // Create BIDIRECTIONAL named pipe
        pipe_handle = CreateNamedPipe(
            config.pipe_path,
            PIPE_ACCESS_DUPLEX,  // Bidirectional!
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
            PIPE_UNLIMITED_INSTANCES,
            256,  // Output buffer
            256,  // Input buffer
            0,
            NULL
        );
        
        if (pipe_handle == INVALID_HANDLE_VALUE) {
            printf("[CONTROLLER] Failed to create pipe: %d\n", GetLastError());
            Sleep(1000);
            continue;
        }
        
        printf("[CONTROLLER] Named pipe created: %s\n", config.pipe_path);
        printf("[CONTROLLER] Waiting for connection...\n");
        
        if (ConnectNamedPipe(pipe_handle, NULL)) {
            printf("[CONTROLLER] Client connected!\n");
            
            char buffer[256];
            char response[256];
            DWORD bytes_read, bytes_written;
            BOOL client_connected = TRUE;
            
            while (client_connected && running) {
                // Read command
                if (ReadFile(pipe_handle, buffer, sizeof(buffer) - 1, &bytes_read, NULL)) {
                    buffer[bytes_read] = '\0';
                    
                    // Clean input
                    char *newline = strchr(buffer, '\n');
                    if (newline) *newline = '\0';
                    char *carriage = strchr(buffer, '\r');
                    if (carriage) *carriage = '\0';
                    
                    printf("[CONTROLLER] << Received: %s\n", buffer);
                    
                    // Execute and prepare response
                    execute_game_command(buffer, response);
                    
                    // Send response back
                    strcat(response, "\n");
                    if (WriteFile(pipe_handle, response, strlen(response), &bytes_written, NULL)) {
                        FlushFileBuffers(pipe_handle);
                        printf("[CONTROLLER] >> Sent: %s", response);
                    } else {
                        printf("[CONTROLLER] Write error: %d\n", GetLastError());
                    }
                } else {
                    DWORD error = GetLastError();
                    if (error == ERROR_BROKEN_PIPE) {
                        printf("[CONTROLLER] Client disconnected\n");
                        client_connected = FALSE;
                    } else {
                        printf("[CONTROLLER] Read error: %d\n", error);
                        Sleep(100);
                    }
                }
            }
        }
        
        if (pipe_handle != INVALID_HANDLE_VALUE) {
            DisconnectNamedPipe(pipe_handle);
            CloseHandle(pipe_handle);
        }
        
        Sleep(100);
    }
    
    printf("[CONTROLLER] Shutting down\n");
    return 0;
}

