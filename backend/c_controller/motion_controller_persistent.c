#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>
#include <process.h>
#include <io.h>
#include <fcntl.h>
#include <time.h>

// Global variables for control
volatile int running = 1;
char *log_file = NULL;

// Configuration structure
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
void execute_game_command(const char *command);
void cleanup_resources(void);
void print_usage(const char *prog_name);
config_t parse_arguments(int argc, char *argv[]);

// Console handler for graceful shutdown
BOOL WINAPI console_handler(DWORD ctrl_type) {
    if (ctrl_type == CTRL_C_EVENT || ctrl_type == CTRL_CLOSE_EVENT) {
        printf("\n[CONTROLLER] Received shutdown signal, stopping gracefully...\n");
        running = 0;
        return TRUE;
    }
    return FALSE;
}

// Log command execution with timing
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

// Execute game command (simplified for demonstration)
void execute_game_command(const char *command) {
    if (strcmp(command, "UP") == 0) {
        log_command(command, "executed");
        // Simulate game action
        printf("[GAME] Moving UP\n");
    } else if (strcmp(command, "DOWN") == 0) {
        log_command(command, "executed");
        printf("[GAME] Moving DOWN\n");
    } else if (strcmp(command, "LEFT") == 0) {
        log_command(command, "executed");
        printf("[GAME] Moving LEFT\n");
    } else if (strcmp(command, "RIGHT") == 0) {
        log_command(command, "executed");
        printf("[GAME] Moving RIGHT\n");
    } else {
        log_command(command, "unknown command");
        printf("[GAME] Unknown command: %s\n", command);
    }
}

// Parse command line arguments
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

// Print usage information
void print_usage(const char *prog_name) {
    printf("MotionPlay C Controller (Windows) - Persistent Version\n");
    printf("Usage: %s [options]\n", prog_name);
    printf("Options:\n");
    printf("  -g <game>     Game name (default: default)\n");
    printf("  -t <threshold> Threshold value (default: 0.5)\n");
    printf("  -f <fps>      FPS target (default: 30)\n");
    printf("  -p <pipe>     Named pipe path (default: \\\\.\\pipe\\vcgi_pipe)\n");
    printf("  -d            Enable debug mode\n");
    printf("  -l <logfile>   Log file path\n");
    printf("  -h            Show this help\n");
    printf("\nFeatures:\n");
    printf("- Persistent server (stays running)\n");
    printf("- Multiple client connections\n");
    printf("- Named pipe communication\n");
    printf("- Signal handling (Ctrl+C)\n");
    printf("- Windows API integration\n");
    printf("- Command-line argument parsing\n");
}

// Cleanup resources
void cleanup_resources(void) {
    // No persistent resources to clean up
}

int main(int argc, char *argv[]) {
    config_t config = parse_arguments(argc, argv);
    
    printf("=== MotionPlay C Controller (Windows) - Persistent ===\n");
    printf("Game: %s\n", config.game);
    printf("Threshold: %.2f\n", config.threshold);
    printf("FPS: %d\n", config.fps);
    printf("Pipe: %s\n", config.pipe_path);
    printf("Debug: %s\n", config.debug ? "ON" : "OFF");
    printf("=====================================================\n\n");
    
    // Set up console handler for graceful shutdown
    SetConsoleCtrlHandler(console_handler, TRUE);
    
    printf("[CONTROLLER] Starting persistent server...\n");
    printf("[CONTROLLER] Press Ctrl+C to stop\n\n");
    
    // Main server loop - stays running
    while (running) {
        HANDLE pipe_handle = INVALID_HANDLE_VALUE;
        
        // Create named pipe
        pipe_handle = CreateNamedPipe(
            config.pipe_path,
            PIPE_ACCESS_INBOUND,
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
            PIPE_UNLIMITED_INSTANCES, 0, 0, 0, NULL
        );
        
        if (pipe_handle == INVALID_HANDLE_VALUE) {
            printf("[CONTROLLER] Failed to create named pipe: %d\n", GetLastError());
            Sleep(1000);
            continue;
        }
        
        printf("[CONTROLLER] Named pipe created: %s\n", config.pipe_path);
        printf("[CONTROLLER] Waiting for client connection...\n");
        
        // Wait for client connection
        if (ConnectNamedPipe(pipe_handle, NULL)) {
            printf("[CONTROLLER] Client connected, waiting for commands...\n");
            
            // Process commands from this client
            char buffer[256];
            DWORD bytes_read;
            BOOL client_connected = TRUE;
            
            while (client_connected && running) {
                if (ReadFile(pipe_handle, buffer, sizeof(buffer) - 1, &bytes_read, NULL)) {
                    buffer[bytes_read] = '\0';
                    
                    // Remove newline if present
                    char *newline = strchr(buffer, '\n');
                    if (newline) *newline = '\0';
                    char *carriage = strchr(buffer, '\r');
                    if (carriage) *carriage = '\0';
                    
                    printf("[CONTROLLER] Received command: %s\n", buffer);
                    execute_game_command(buffer);
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
        } else {
            DWORD error = GetLastError();
            if (error == ERROR_PIPE_CONNECTED) {
                printf("[CONTROLLER] Client connected immediately\n");
            } else {
                printf("[CONTROLLER] Failed to connect to pipe: %d\n", error);
            }
        }
        
        // Close the pipe handle
        if (pipe_handle != INVALID_HANDLE_VALUE) {
            CloseHandle(pipe_handle);
        }
        
        // Small delay before accepting next connection
        Sleep(100);
    }
    
    printf("[CONTROLLER] Shutting down...\n");
    cleanup_resources();
    
    return 0;
}
