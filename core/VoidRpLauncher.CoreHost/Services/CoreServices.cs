using System.Diagnostics;
using System.IO;
using System.Net.Http.Json;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using VoidRpLauncher.CoreHost.Models;
using CmlLib.Core;
using CmlLib.Core.Auth;
using CmlLib.Core.ProcessBuilder;

namespace VoidRpLauncher.CoreHost.Services;

public sealed class LauncherPlatformService
{
    public LauncherPlatformInfo Current { get; } = Detect();
    private static LauncherPlatformInfo Detect()
    {
        if (OperatingSystem.IsWindows())
        {
            return new LauncherPlatformInfo { Rid = "win-x64", DisplayName = "Windows x64", IsWindows = true, IsMacOs = false, LauncherExecutableFileName = "VoidRpLauncher.App.exe", UpdaterExecutableFileName = "VoidRpLauncher.Updater.exe", RuntimeManifestFileName = "runtime-manifest.win-x64.json" };
        }
        if (OperatingSystem.IsMacOS())
        {
            var rid = RuntimeInformation.ProcessArchitecture switch
            {
                Architecture.Arm64 => "osx-arm64",
                Architecture.X64 => "osx-x64",
                _ => throw new PlatformNotSupportedException($"macOS architecture '{RuntimeInformation.ProcessArchitecture}' is not supported.")
            };
            return new LauncherPlatformInfo { Rid = rid, DisplayName = rid == "osx-arm64" ? "macOS Apple Silicon" : "macOS Intel", IsWindows = false, IsMacOs = true, LauncherExecutableFileName = "VoidRpLauncher.App", UpdaterExecutableFileName = "VoidRpLauncher.Updater", RuntimeManifestFileName = $"runtime-manifest.{rid}.json" };
        }
        throw new PlatformNotSupportedException("Only Windows x64 and macOS are supported.");
    }
}

public sealed class LauncherPlatformInfo
{
    public string Rid { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public bool IsWindows { get; init; }
    public bool IsMacOs { get; init; }
    public string LauncherExecutableFileName { get; init; } = string.Empty;
    public string UpdaterExecutableFileName { get; init; } = string.Empty;
    public string RuntimeManifestFileName { get; init; } = string.Empty;
}

public sealed class LauncherPathsService
{
    private readonly LauncherPlatformService _platformService;
    public LauncherPlatformInfo Platform => _platformService.Current;
    public string BaseDirectory { get; }
    public string LauncherInstallDirectory { get; }
    public string GameDirectory => Path.Combine(BaseDirectory, "game");
    public string VersionsDirectory => Path.Combine(GameDirectory, "versions");
    public string JavaDirectory => Path.Combine(GameDirectory, "java");
    public string LogsDirectory => Path.Combine(BaseDirectory, "logs");
    public string StateDirectory => Path.Combine(BaseDirectory, "state");
    public string TempDirectory => Path.Combine(BaseDirectory, "temp");
    public string SelfUpdateDirectory => Path.Combine(TempDirectory, "self-update");
    public string SettingsFilePath => Path.Combine(BaseDirectory, "launcher_settings.json");

    public LauncherPathsService(LauncherPlatformService platformService)
    {
        _platformService = platformService;
        BaseDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "VoidRpLauncher");
        LauncherInstallDirectory = ResolveLauncherInstallDirectory();
    }

    public void EnsureBaseDirectories()
    {
        Directory.CreateDirectory(BaseDirectory);
        Directory.CreateDirectory(GameDirectory);
        Directory.CreateDirectory(VersionsDirectory);
        Directory.CreateDirectory(JavaDirectory);
        Directory.CreateDirectory(LogsDirectory);
        Directory.CreateDirectory(StateDirectory);
        Directory.CreateDirectory(TempDirectory);
        Directory.CreateDirectory(SelfUpdateDirectory);
    }

    public string GetCurrentExecutablePath()
    {
        var executablePath = Environment.ProcessPath;
        if (string.IsNullOrWhiteSpace(executablePath)) throw new InvalidOperationException("Could not resolve current launcher executable path.");
        return executablePath;
    }

    public string GetCurrentLauncherUpdateTargetPath() => Platform.IsMacOs ? GetCurrentAppBundlePath() : GetCurrentExecutablePath();

    public string GetCurrentAppBundlePath()
    {
        var executablePath = GetCurrentExecutablePath();
        var bundlePath = TryResolveAppBundlePath(executablePath);
        if (string.IsNullOrWhiteSpace(bundlePath)) throw new InvalidOperationException("Current macOS launcher is not running from a .app bundle.");
        return bundlePath;
    }

    public string ResolveJavaExecutablePath()
    {
        var guiPath = Path.Combine(JavaDirectory, "bin", Platform.IsWindows ? "javaw.exe" : "java");
        var consolePath = Path.Combine(JavaDirectory, "bin", Platform.IsWindows ? "java.exe" : "java");
        if (File.Exists(guiPath)) return guiPath;
        if (File.Exists(consolePath)) return consolePath;
        if (Directory.Exists(JavaDirectory))
        {
            var f1 = Directory.EnumerateFiles(JavaDirectory, Platform.IsWindows ? "javaw.exe" : "java", SearchOption.AllDirectories).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(f1)) return f1;
            var f2 = Directory.EnumerateFiles(JavaDirectory, Platform.IsWindows ? "java.exe" : "java", SearchOption.AllDirectories).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(f2)) return f2;
        }
        throw new FileNotFoundException($"Java executable not found inside '{JavaDirectory}'.");
    }

    private string ResolveLauncherInstallDirectory()
    {
        var executablePath = Environment.ProcessPath;
        if (string.IsNullOrWhiteSpace(executablePath)) return AppContext.BaseDirectory;
        if (Platform.IsMacOs)
        {
            var bundlePath = TryResolveAppBundlePath(executablePath);
            if (!string.IsNullOrWhiteSpace(bundlePath)) return Path.GetDirectoryName(bundlePath) ?? AppContext.BaseDirectory;
        }
        return Path.GetDirectoryName(executablePath) ?? AppContext.BaseDirectory;
    }

    private static string? TryResolveAppBundlePath(string executablePath)
    {
        var current = Path.GetDirectoryName(executablePath);
        while (!string.IsNullOrWhiteSpace(current))
        {
            if (current.EndsWith(".app", StringComparison.OrdinalIgnoreCase)) return current;
            current = Directory.GetParent(current)?.FullName;
        }
        return null;
    }
}

public sealed class HashService
{
    public string ComputeSha256(string filePath)
    {
        Exception? lastError = null;
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            try
            {
                using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                using var sha256 = SHA256.Create();
                return Convert.ToHexString(sha256.ComputeHash(stream));
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                lastError = ex;
                Thread.Sleep(100);
            }
        }
        throw new IOException($"Unable to read file for SHA-256: {filePath}", lastError);
    }
}

public sealed class LauncherSettingsService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private readonly LauncherPathsService _pathsService;
    public event EventHandler? SettingsChanged;
    public LauncherSettingsService(LauncherPathsService pathsService) => _pathsService = pathsService;

    public LauncherUserSettings Load()
    {
        try
        {
            _pathsService.EnsureBaseDirectories();
            if (!File.Exists(_pathsService.SettingsFilePath))
            {
                var defaults = new LauncherUserSettings();
                Save(defaults);
                return defaults;
            }
            var json = File.ReadAllText(_pathsService.SettingsFilePath);
            var settings = JsonSerializer.Deserialize<LauncherUserSettings>(json) ?? new LauncherUserSettings();
            settings.MaxRamMb = NormalizeMemory(settings.MaxRamMb);
            return settings;
        }
        catch
        {
            return new LauncherUserSettings();
        }
    }

    public void Save(LauncherUserSettings settings)
    {
        _pathsService.EnsureBaseDirectories();
        settings.MaxRamMb = NormalizeMemory(settings.MaxRamMb);
        File.WriteAllText(_pathsService.SettingsFilePath, JsonSerializer.Serialize(settings, JsonOptions));
        SettingsChanged?.Invoke(this, EventArgs.Empty);
    }

    public int NormalizeMemory(int value)
    {
        if (value <= 0) value = 4096;
        value = (int)(Math.Round(value / 512.0) * 512);
        if (value < 2048) value = 2048;
        if (value > 16384) value = 16384;
        return value;
    }
}

public sealed class ManifestService
{
    private static readonly HttpClient HttpClient = new();
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { PropertyNameCaseInsensitive = true };
    private readonly DiagnosticsService _diagnostics;
    public ManifestService(DiagnosticsService diagnostics) => _diagnostics = diagnostics;

    public async Task<LauncherManifest> LoadAsync(string manifestUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(manifestUrl)) throw new ArgumentException("Manifest URL is empty.", nameof(manifestUrl));
        _diagnostics.Info("Manifest", $"Loading pack manifest: {manifestUrl}");
        var manifest = await HttpClient.GetFromJsonAsync<LauncherManifest>(AddCacheBuster(manifestUrl), JsonOptions, cancellationToken);
        if (manifest is null) throw new InvalidOperationException("Manifest is empty or could not be parsed.");
        _diagnostics.Info("Manifest", $"Manifest loaded: {manifest.PackName} {manifest.PackVersion}");
        return manifest;
    }

    private static string AddCacheBuster(string url)
    {
        var separator = url.Contains('?') ? "&" : "?";
        return $"{url}{separator}t={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
    }
}

public sealed class FileSyncService
{
    private static readonly HttpClient HttpClient = new();
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private readonly LauncherPathsService _pathsService;
    private readonly HashService _hashService;
    private readonly DiagnosticsService _diagnostics;

    public FileSyncService(LauncherPathsService pathsService, HashService hashService, DiagnosticsService diagnostics)
    {
        _pathsService = pathsService;
        _hashService = hashService;
        _diagnostics = diagnostics;
    }

    public Task SyncAsync(LauncherManifest manifest, IProgress<SyncProgressInfo>? progress = null, CancellationToken cancellationToken = default)
        => SyncAsync(manifest, manifest.PackName, progress, cancellationToken);

    public async Task SyncAsync(LauncherManifest manifest, string syncKey, IProgress<SyncProgressInfo>? progress = null, CancellationToken cancellationToken = default)
    {
        if (manifest is null) throw new ArgumentNullException(nameof(manifest));
        if (string.IsNullOrWhiteSpace(syncKey)) throw new ArgumentException("Sync key is empty.", nameof(syncKey));
        _pathsService.EnsureBaseDirectories();

        var normalizedSyncKey = SanitizeFileName(syncKey);
        var stateFilePath = Path.Combine(_pathsService.StateDirectory, $"{normalizedSyncKey}.json");
        var logFilePath = Path.Combine(_pathsService.LogsDirectory, $"sync-{normalizedSyncKey}-{DateTime.Now:yyyyMMdd-HHmmss}.log");
        var currentManifestPaths = manifest.Files.Select(f => NormalizeRelativePath(f.Path)).Where(p => !string.IsNullOrWhiteSpace(p)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var previousState = await LoadStateAsync(stateFilePath, cancellationToken);

        await using var logWriter = new StreamWriter(logFilePath, append: false);
        await logWriter.WriteLineAsync($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Sync started");
        await logWriter.WriteLineAsync($"Key: {normalizedSyncKey}");
        await logWriter.WriteLineAsync($"Pack: {manifest.PackName}");
        await logWriter.WriteLineAsync($"Version: {manifest.PackVersion}");
        await logWriter.WriteLineAsync($"Files in manifest: {manifest.Files.Count}");
        await logWriter.WriteLineAsync(string.Empty);
        _diagnostics.Info("Sync", $"Sync started. Key={normalizedSyncKey}, files={manifest.Files.Count}");

        var orderedFiles = manifest.Files.OrderBy(f => NormalizeRelativePath(f.Path), StringComparer.OrdinalIgnoreCase).ToList();
        for (var index = 0; index < orderedFiles.Count; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var entry = orderedFiles[index];
            var relativePath = NormalizeRelativePath(entry.Path);
            if (string.IsNullOrWhiteSpace(relativePath)) continue;
            var localPath = Path.Combine(_pathsService.GameDirectory, relativePath.Replace('/', Path.DirectorySeparatorChar));
            var localDirectory = Path.GetDirectoryName(localPath);
            if (!string.IsNullOrWhiteSpace(localDirectory)) Directory.CreateDirectory(localDirectory);

            progress?.Report(new SyncProgressInfo { Stage = "Проверяем файл", CurrentFile = relativePath, ProcessedFiles = index, TotalFiles = orderedFiles.Count, Percent = CalculateSyncPercent(index, orderedFiles.Count, 0), DetailMessage = "Проверяем наличие, размер и SHA-256...", LocalPath = localPath, SourceUrl = entry.Url });
            var needsDownload = NeedsDownload(entry, localPath);
            if (needsDownload)
            {
                _diagnostics.Info("Sync", $"Downloading: {relativePath}");
                await logWriter.WriteLineAsync($"[DOWNLOAD] {relativePath}");
                await DownloadFileAsync(entry, relativePath, localPath, index, orderedFiles.Count, progress, cancellationToken);
            }
            else
            {
                await logWriter.WriteLineAsync($"[OK] {relativePath}");
            }

            progress?.Report(new SyncProgressInfo { Stage = "Файл готов", CurrentFile = relativePath, ProcessedFiles = index + 1, TotalFiles = orderedFiles.Count, Percent = orderedFiles.Count == 0 ? 85 : ((double)(index + 1) / orderedFiles.Count) * 85.0, DetailMessage = "Файл актуален и готов к использованию.", LocalPath = localPath, SourceUrl = entry.Url, CurrentFileBytesDownloaded = entry.Size, CurrentFileBytesTotal = entry.Size });
        }

        var staleFiles = previousState.Files.Except(currentManifestPaths, StringComparer.OrdinalIgnoreCase).OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList();
        for (var index = 0; index < staleFiles.Count; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var relativePath = NormalizeRelativePath(staleFiles[index]);
            var fullPath = Path.Combine(_pathsService.GameDirectory, relativePath.Replace('/', Path.DirectorySeparatorChar));
            progress?.Report(new SyncProgressInfo { Stage = "Чистим устаревшие файлы", CurrentFile = relativePath, ProcessedFiles = index, TotalFiles = staleFiles.Count, Percent = staleFiles.Count == 0 ? 100 : 85.0 + (((double)index / staleFiles.Count) * 15.0), DetailMessage = "Проверяем и удаляем устаревший managed-файл...", LocalPath = fullPath });
            if (IsProtectedFromDeletion(relativePath)) { await logWriter.WriteLineAsync($"[SKIP-PROTECTED] {relativePath}"); continue; }
            if (!File.Exists(fullPath)) { await logWriter.WriteLineAsync($"[MISSING-ALREADY] {relativePath}"); continue; }
            try { File.Delete(fullPath); DeleteEmptyParentDirectories(fullPath, _pathsService.GameDirectory); await logWriter.WriteLineAsync($"[DELETE] {relativePath}"); }
            catch (Exception ex) { await logWriter.WriteLineAsync($"[DELETE-FAILED] {relativePath} :: {ex.Message}"); }
        }

        await SaveStateAsync(stateFilePath, new SyncState { Files = currentManifestPaths.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList() }, cancellationToken);
        progress?.Report(new SyncProgressInfo { Stage = "Готово", Percent = 100, ProcessedFiles = orderedFiles.Count, TotalFiles = orderedFiles.Count, DetailMessage = "Синхронизация завершена." });
        _diagnostics.Info("Sync", $"Sync finished. Log file: {logFilePath}");
    }

    private bool NeedsDownload(LauncherManifestFile entry, string localPath)
    {
        if (!File.Exists(localPath)) return true;
        var fileInfo = new FileInfo(localPath);
        if (fileInfo.Length != entry.Size) return true;
        return !_hashService.ComputeSha256(localPath).Equals(entry.Sha256, StringComparison.OrdinalIgnoreCase);
    }

    private async Task DownloadFileAsync(LauncherManifestFile entry, string relativePath, string localPath, int fileIndex, int totalFiles, IProgress<SyncProgressInfo>? progress, CancellationToken cancellationToken)
    {
        var tempPath = localPath + ".download";
        if (File.Exists(tempPath)) File.Delete(tempPath);
        try
        {
            using var response = await HttpClient.GetAsync(entry.Url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            response.EnsureSuccessStatusCode();
            var totalBytes = response.Content.Headers.ContentLength > 0 ? response.Content.Headers.ContentLength.Value : entry.Size;
            await using (var sourceStream = await response.Content.ReadAsStreamAsync(cancellationToken))
            await using (var targetStream = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                var buffer = new byte[1024 * 64];
                long downloadedBytes = 0;
                while (true)
                {
                    var read = await sourceStream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken);
                    if (read <= 0) break;
                    await targetStream.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                    downloadedBytes += read;
                    var ratio = totalBytes > 0 ? Math.Min(1.0, (double)downloadedBytes / totalBytes) : 0;
                    progress?.Report(new SyncProgressInfo { Stage = "Скачиваем файл", CurrentFile = relativePath, ProcessedFiles = fileIndex, TotalFiles = totalFiles, Percent = CalculateSyncPercent(fileIndex, totalFiles, ratio), DetailMessage = totalBytes > 0 ? $"Скачано {FormatBytes(downloadedBytes)} из {FormatBytes(totalBytes)}" : $"Скачано {FormatBytes(downloadedBytes)}", LocalPath = localPath, SourceUrl = entry.Url, CurrentFileBytesDownloaded = downloadedBytes, CurrentFileBytesTotal = totalBytes });
                }
                await targetStream.FlushAsync(cancellationToken);
            }
            var downloadedHash = _hashService.ComputeSha256(tempPath);
            if (!downloadedHash.Equals(entry.Sha256, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException($"Hash mismatch after download. Expected {entry.Sha256}, got {downloadedHash}.");
            if (File.Exists(localPath)) File.Delete(localPath);
            File.Move(tempPath, localPath);
        }
        catch
        {
            if (File.Exists(tempPath)) File.Delete(tempPath);
            throw;
        }
    }

    private static async Task<SyncState> LoadStateAsync(string stateFilePath, CancellationToken cancellationToken)
    {
        if (!File.Exists(stateFilePath)) return new SyncState();
        try { return JsonSerializer.Deserialize<SyncState>(await File.ReadAllTextAsync(stateFilePath, cancellationToken)) ?? new SyncState(); }
        catch { return new SyncState(); }
    }

    private static async Task SaveStateAsync(string stateFilePath, SyncState state, CancellationToken cancellationToken)
        => await File.WriteAllTextAsync(stateFilePath, JsonSerializer.Serialize(state, JsonOptions), cancellationToken);

    private static double CalculateSyncPercent(int fileIndex, int totalFiles, double fileRatio)
    {
        if (totalFiles <= 0) return 0;
        fileRatio = Math.Max(0, Math.Min(1, fileRatio));
        return (((double)fileIndex / totalFiles) + (fileRatio / totalFiles)) * 85.0;
    }

    private static string NormalizeRelativePath(string path) => path.Replace('\\', '/').Trim('/');
    private static bool IsProtectedFromDeletion(string relativePath)
    {
        var normalized = NormalizeRelativePath(relativePath);
        return normalized.StartsWith("saves/", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("screenshots/", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("logs/", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("crash-reports/", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("downloads/", StringComparison.OrdinalIgnoreCase);
    }

    private static string FormatBytes(long bytes)
    {
        if (bytes <= 0) return "0 B";
        string[] units = ["B", "KB", "MB", "GB", "TB"];
        double value = bytes;
        var unitIndex = 0;
        while (value >= 1024 && unitIndex < units.Length - 1) { value /= 1024; unitIndex++; }
        return $"{value:0.##} {units[unitIndex]}";
    }

    private static void DeleteEmptyParentDirectories(string filePath, string stopRoot)
    {
        var current = Path.GetDirectoryName(filePath);
        while (!string.IsNullOrWhiteSpace(current) && current.StartsWith(stopRoot, StringComparison.OrdinalIgnoreCase) && !string.Equals(current, stopRoot, StringComparison.OrdinalIgnoreCase))
        {
            if (Directory.Exists(current) && !Directory.EnumerateFileSystemEntries(current).Any())
            {
                Directory.Delete(current);
                current = Path.GetDirectoryName(current);
            }
            else break;
        }
    }

    private static string SanitizeFileName(string value)
    {
        foreach (var invalidChar in Path.GetInvalidFileNameChars()) value = value.Replace(invalidChar, '_');
        return value.Replace(' ', '_');
    }

    private sealed class SyncState { public List<string> Files { get; set; } = new(); }
}

public sealed class ClientRepairService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly LauncherPathsService _pathsService;
    private readonly DiagnosticsService _diagnostics;
    public ClientRepairService(LauncherPathsService pathsService, DiagnosticsService diagnostics) { _pathsService = pathsService; _diagnostics = diagnostics; }

    public async Task RepairAsync(IProgress<string>? progress = null, CancellationToken cancellationToken = default)
    {
        _pathsService.EnsureBaseDirectories();
        progress?.Report("Читаем состояние клиента...");
        _diagnostics.Info("Repair", "Reading launcher state files.");
        var stateFiles = Directory.Exists(_pathsService.StateDirectory) ? Directory.GetFiles(_pathsService.StateDirectory, "*.json", SearchOption.TopDirectoryOnly) : Array.Empty<string>();
        var managedPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var stateFile in stateFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                var json = await File.ReadAllTextAsync(stateFile, cancellationToken);
                var state = JsonSerializer.Deserialize<SyncState>(json, JsonOptions);
                if (state?.Files is null) continue;
                foreach (var relativePath in state.Files) if (!string.IsNullOrWhiteSpace(relativePath)) managedPaths.Add(NormalizeRelativePath(relativePath));
            }
            catch (Exception ex) { _diagnostics.Warn("Repair", $"Broken state file skipped: {stateFile} :: {ex.Message}"); }
        }
        progress?.Report("Удаляем managed-файлы...");
        foreach (var relativePath in managedPaths.OrderBy(x => x, StringComparer.OrdinalIgnoreCase))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (IsProtected(relativePath)) continue;
            var fullPath = Path.Combine(_pathsService.GameDirectory, relativePath.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(fullPath)) continue;
            try { File.Delete(fullPath); DeleteEmptyParentDirectories(fullPath, _pathsService.GameDirectory); }
            catch (Exception ex) { _diagnostics.Warn("Repair", $"Failed deleting managed file: {fullPath} :: {ex.Message}"); }
        }
        progress?.Report("Удаляем state-файлы...");
        foreach (var stateFile in stateFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try { File.Delete(stateFile); }
            catch (Exception ex) { _diagnostics.Warn("Repair", $"Failed deleting state file: {stateFile} :: {ex.Message}"); }
        }
        progress?.Report("Чистим временные загрузки...");
        if (Directory.Exists(_pathsService.GameDirectory))
            foreach (var file in Directory.EnumerateFiles(_pathsService.GameDirectory, "*.download", SearchOption.AllDirectories)) try { File.Delete(file); } catch { }
        progress?.Report("Ремонт завершён.");
        _diagnostics.Info("Repair", "Repair finished.");
    }

    private static bool IsProtected(string relativePath)
    {
        var normalized = NormalizeRelativePath(relativePath);
        return normalized.StartsWith("saves/", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("screenshots/", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("logs/", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("crash-reports/", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("downloads/", StringComparison.OrdinalIgnoreCase);
    }
    private static string NormalizeRelativePath(string path) => path.Replace('\\', '/').Trim('/');
    private static void DeleteEmptyParentDirectories(string filePath, string stopRoot)
    {
        var current = Path.GetDirectoryName(filePath);
        while (!string.IsNullOrWhiteSpace(current) && current.StartsWith(stopRoot, StringComparison.OrdinalIgnoreCase) && !string.Equals(current, stopRoot, StringComparison.OrdinalIgnoreCase))
        {
            if (Directory.Exists(current) && !Directory.EnumerateFileSystemEntries(current).Any()) { Directory.Delete(current); current = Path.GetDirectoryName(current); }
            else break;
        }
    }
    private sealed class SyncState { public List<string> Files { get; set; } = new(); }
}

public sealed class LocalMinecraftLaunchService
{
    private readonly LauncherPathsService _pathsService;
    private readonly DiagnosticsService _diagnostics;

    public LocalMinecraftLaunchService(LauncherPathsService pathsService, DiagnosticsService diagnostics)
    {
        _pathsService = pathsService;
        _diagnostics = diagnostics;
    }

    public async Task<Process> LaunchAsync(string nickname, LauncherManifest manifest, int maximumRamMb)
    {
        if (string.IsNullOrWhiteSpace(nickname))
            throw new ArgumentException("Nickname is empty.", nameof(nickname));

        if (manifest is null)
            throw new ArgumentNullException(nameof(manifest));

        if (string.IsNullOrWhiteSpace(manifest.LauncherProfileId))
            throw new InvalidOperationException("LauncherProfileId is missing in manifest.");

        _pathsService.EnsureBaseDirectories();

        var javaPath = _pathsService.ResolveJavaExecutablePath();
        var versionJsonPath = Path.Combine(
            _pathsService.VersionsDirectory,
            manifest.LauncherProfileId,
            manifest.LauncherProfileId + ".json");

        _diagnostics.Info("Launch", $"Java path: {javaPath}");
        _diagnostics.Info("Launch", $"Version json: {versionJsonPath}");
        _diagnostics.Info("Launch", $"Maximum RAM: {maximumRamMb} MB");
        _diagnostics.Info("Launch", $"Launcher profile id: {manifest.LauncherProfileId}");

        if (!File.Exists(versionJsonPath))
        {
            throw new FileNotFoundException(
                "Не найден version profile для Minecraft/NeoForge. " +
                $"Ожидался файл: {versionJsonPath}. " +
                "Это значит, что pack manifest не синхронизировал профиль версии " +
                "или профиль NeoForge ещё не установлен локально.",
                versionJsonPath);
        }

        var minecraftPath = new MinecraftPath(_pathsService.GameDirectory);
        var launcher = new MinecraftLauncher(minecraftPath);

        var launchOption = new MLaunchOption
        {
            Session = MSession.CreateOfflineSession(nickname.Trim()),
            MaximumRamMb = maximumRamMb,
            JavaPath = javaPath
        };

        var process = await launcher.CreateProcessAsync(manifest.LauncherProfileId, launchOption);
        process.EnableRaisingEvents = true;
        process.Start();

        _diagnostics.Info("Launch", $"Minecraft process started for {nickname}.");
        return process;
    }
}



