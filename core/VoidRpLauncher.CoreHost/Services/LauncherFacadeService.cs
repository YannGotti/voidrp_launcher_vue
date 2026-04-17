using System.Threading;
using VoidRpLauncher.CoreHost.Configuration;
using VoidRpLauncher.CoreHost.Contracts;
using VoidRpLauncher.CoreHost.Models;
using VoidRpLauncher.CoreHost.Models.Account;
using VoidRpLauncher.CoreHost.Services.Account;

namespace VoidRpLauncher.CoreHost.Services;

public sealed class LauncherFacadeService
{
    private readonly AppEndpointsOptions _endpoints;
    private readonly ManifestService _manifestService;
    private readonly FileSyncService _fileSyncService;
    private readonly ClientRepairService _clientRepairService;
    private readonly RuntimeBootstrapService _runtimeBootstrapService;
    private readonly LauncherAuthSessionService _authSessionService;
    private readonly AuthenticatedLaunchService _authenticatedLaunchService;
    private readonly LauncherSettingsService _settingsService;
    private readonly LauncherPathsService _pathsService;
    private readonly LauncherStateService _stateService;
    private readonly DiagnosticsService _diagnostics;
    private readonly AppVersionService _appVersionService;
    private readonly SemaphoreSlim _operationLock = new(1, 1);

    public LauncherFacadeService(
        AppEndpointsOptions endpoints,
        ManifestService manifestService,
        FileSyncService fileSyncService,
        ClientRepairService clientRepairService,
        RuntimeBootstrapService runtimeBootstrapService,
        LauncherAuthSessionService authSessionService,
        AuthenticatedLaunchService authenticatedLaunchService,
        LauncherSettingsService settingsService,
        LauncherPathsService pathsService,
        LauncherStateService stateService,
        DiagnosticsService diagnostics,
        AppVersionService appVersionService)
    {
        _endpoints = endpoints;
        _manifestService = manifestService;
        _fileSyncService = fileSyncService;
        _clientRepairService = clientRepairService;
        _runtimeBootstrapService = runtimeBootstrapService;
        _authSessionService = authSessionService;
        _authenticatedLaunchService = authenticatedLaunchService;
        _settingsService = settingsService;
        _pathsService = pathsService;
        _stateService = stateService;
        _diagnostics = diagnostics;
        _appVersionService = appVersionService;
    }

    public LauncherStateDto GetState()
        => _stateService.BuildState(_pathsService, _settingsService, _diagnostics, _appVersionService, _endpoints);

    public async Task<OperationResponseDto> InitializeAsync(CancellationToken cancellationToken = default)
        => await RunExclusiveAsync(async () =>
        {
            if (_stateService.IsInitialized)
            {
                return OperationResponseDto.Success(GetState());
            }

            _pathsService.EnsureBaseDirectories();
            _diagnostics.Info("Core", "Launcher core bootstrap started.");
            _stateService.SetStatus("Подготавливаем окружение...");
            _stateService.SetProgress("Java runtime", "Проверяем игровой Java runtime...", 0);

            try
            {
                await _runtimeBootstrapService.EnsureRuntimeAsync((details, percent) =>
                {
                    _stateService.SetProgress("Java runtime", details, percent);
                }, cancellationToken);

                var snapshot = await _authSessionService.TryRestoreAsync(cancellationToken);
                if (snapshot is not null)
                {
                    try
                    {
                        snapshot = await _authSessionService.ReloadMeAsync(cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _diagnostics.Warn("Auth", $"ReloadMe failed during init: {ex.Message}");
                    }
                }

                var dashboard = snapshot?.IsAuthenticated == true
                    ? await TryLoadDashboardAsync(cancellationToken)
                    : null;

                _stateService.ApplySnapshot(snapshot);
                _stateService.ApplyDashboard(dashboard);
                _stateService.SetInitialized(true);
                _stateService.ClearProgress();
                _stateService.SetStatus(snapshot?.IsAuthenticated == true
                    ? "Лаунчер готов. Можно запускать игру."
                    : "Лаунчер готов. Выполните вход для запуска.");

                return OperationResponseDto.Success(GetState());
            }
            catch (Exception ex)
            {
                _stateService.SetStatus($"Ошибка инициализации: {ex.Message}");
                _diagnostics.AppendException("Core", ex);
                return OperationResponseDto.Failure(GetState(), ex.Message);
            }
        });

    public async Task<OperationResponseDto> LoginAsync(string login, string password, CancellationToken cancellationToken = default)
        => await RunExclusiveAsync(async () =>
        {
            _stateService.SetStatus("Выполняем вход...");
            _stateService.ClearProgress();

            try
            {
                var snapshot = await _authSessionService.LoginAsync(login.Trim(), password, cancellationToken);

                try
                {
                    snapshot = await _authSessionService.ReloadMeAsync(cancellationToken);
                }
                catch
                {
                }

                var dashboard = await TryLoadDashboardAsync(cancellationToken);
                _stateService.ApplySnapshot(snapshot);
                _stateService.ApplyDashboard(dashboard);
                _stateService.SetStatus("Вход выполнен.");
                return OperationResponseDto.Success(GetState(), "Вход выполнен.");
            }
            catch (Exception ex)
            {
                _stateService.SetStatus($"Ошибка входа: {ex.Message}");
                _diagnostics.AppendException("Auth", ex);
                return OperationResponseDto.Failure(GetState(), ex.Message);
            }
        });

    public async Task<OperationResponseDto> LogoutAsync(CancellationToken cancellationToken = default)
        => await RunExclusiveAsync(async () =>
        {
            _stateService.SetStatus("Завершаем сессию...");
            _stateService.ClearProgress();

            try
            {
                await _authSessionService.LogoutAsync(cancellationToken);
                _stateService.ApplySnapshot(null);
                _stateService.ApplyDashboard(null);
                _stateService.SetStatus("Вы вышли из аккаунта.");
                return OperationResponseDto.Success(GetState(), "Вы вышли из аккаунта.");
            }
            catch (Exception ex)
            {
                _stateService.SetStatus($"Ошибка выхода: {ex.Message}");
                _diagnostics.AppendException("Auth", ex);
                return OperationResponseDto.Failure(GetState(), ex.Message);
            }
        });

    public async Task<OperationResponseDto> PlayAsync(CancellationToken cancellationToken = default)
        => await RunExclusiveAsync(async () =>
        {
            if (!_stateService.IsInitialized)
            {
                _stateService.SetStatus("Лаунчер ещё не завершил инициализацию. Дождитесь подготовки.");
                return OperationResponseDto.Failure(GetState(), "Лаунчер ещё не завершил инициализацию.");
            }

            _stateService.SetStatus("Проверяем клиент перед запуском...");
            _stateService.SetProgress("Java runtime", "Проверяем игровой Java runtime...", 0);

            try
            {
                await _runtimeBootstrapService.EnsureRuntimeAsync((details, percent) =>
                {
                    _stateService.SetProgress("Java runtime", details, percent);
                }, cancellationToken);

                _stateService.SetProgress("Подготовка", "Загружаем pack manifest...", 0);

                var manifest = await _manifestService.LoadAsync(_endpoints.PackManifestUrl, cancellationToken);
                if (!string.IsNullOrWhiteSpace(manifest.MinLauncherVersion) &&
                    !_appVersionService.IsCurrentVersionAtLeast(manifest.MinLauncherVersion))
                {
                    throw new InvalidOperationException($"Требуется обновление лаунчера до версии {manifest.MinLauncherVersion} или выше.");
                }

                var syncProgress = new Progress<SyncProgressInfo>(info =>
                    _stateService.SetProgress(
                        string.IsNullOrWhiteSpace(info.Stage) ? "Синхронизация" : info.Stage,
                        BuildSyncDetails(info),
                        ClampPercent(info.Percent)));

                await _fileSyncService.SyncAsync(manifest, syncProgress, cancellationToken);

                var memoryMb = _settingsService.Load().MaxRamMb;
                var launchProgress = new Progress<LaunchProgressInfo>(info =>
                    _stateService.SetProgress(
                        string.IsNullOrWhiteSpace(info.Stage) ? "Запуск" : info.Stage,
                        string.IsNullOrWhiteSpace(info.Details) ? "Запускаем Minecraft..." : info.Details,
                        ClampPercent(info.Percent)));

                await _authenticatedLaunchService.LaunchAsync(manifest, memoryMb, launchProgress, cancellationToken);

                _stateService.ClearProgress();
                _stateService.SetStatus("Minecraft запущен.");
                return OperationResponseDto.Success(GetState(), "Minecraft запущен.");
            }
            catch (Exception ex)
            {
                _stateService.SetStatus($"Ошибка запуска: {ex.Message}");
                _diagnostics.AppendException("Play", ex);
                return OperationResponseDto.Failure(GetState(), ex.Message);
            }
        });

    public async Task<OperationResponseDto> RepairAsync(CancellationToken cancellationToken = default)
        => await RunExclusiveAsync(async () =>
        {
            _stateService.SetStatus("Выполняем ремонт клиента...");
            _stateService.SetProgress("Ремонт", "Чистим managed-файлы и state...", 0);

            try
            {
                var repairProgress = new Progress<string>(message =>
                    _stateService.SetProgress("Ремонт", message, 50));

                await _clientRepairService.RepairAsync(repairProgress, cancellationToken);

                _stateService.SetProgress("Ремонт", "Готово.", 100);
                _stateService.SetStatus("Ремонт завершён. Теперь можно заново синхронизировать клиент.");
                return OperationResponseDto.Success(GetState(), "Ремонт завершён.");
            }
            catch (Exception ex)
            {
                _stateService.SetStatus($"Ошибка ремонта: {ex.Message}");
                _diagnostics.AppendException("Repair", ex);
                return OperationResponseDto.Failure(GetState(), ex.Message);
            }
        });

    public OperationResponseDto SaveSettings(int maxRamMb)
    {
        try
        {
            _settingsService.Save(new LauncherUserSettings { MaxRamMb = maxRamMb });
            return OperationResponseDto.Success(GetState(), "Настройки сохранены.");
        }
        catch (Exception ex)
        {
            _stateService.SetStatus($"Ошибка сохранения настроек: {ex.Message}");
            _diagnostics.AppendException("Settings", ex);
            return OperationResponseDto.Failure(GetState(), ex.Message);
        }
    }

    public OperationResponseDto ResetSettings()
    {
        try
        {
            _settingsService.Save(new LauncherUserSettings { MaxRamMb = 4096 });
            return OperationResponseDto.Success(GetState(), "Настройки сброшены к значению 4.0 GB.");
        }
        catch (Exception ex)
        {
            _stateService.SetStatus($"Ошибка сброса настроек: {ex.Message}");
            _diagnostics.AppendException("Settings", ex);
            return OperationResponseDto.Failure(GetState(), ex.Message);
        }
    }

    public OperationResponseDto ClearDiagnostics()
    {
        _diagnostics.Clear();
        return OperationResponseDto.Success(GetState(), "Диагностика очищена.");
    }

    private async Task<OperationResponseDto> RunExclusiveAsync(Func<Task<OperationResponseDto>> action)
    {
        if (!await _operationLock.WaitAsync(0))
        {
            return OperationResponseDto.Failure(GetState(), "Лаунчер уже выполняет другую операцию.");
        }

        _stateService.SetBusy(true);
        try
        {
            return await action();
        }
        finally
        {
            _stateService.SetBusy(false);
            _operationLock.Release();
        }
    }

    private static string BuildSyncDetails(SyncProgressInfo info)
    {
        if (!string.IsNullOrWhiteSpace(info.DetailMessage))
        {
            return info.DetailMessage;
        }

        if (!string.IsNullOrWhiteSpace(info.CurrentFile) && info.TotalFiles > 0)
        {
            return $"{info.CurrentFile} • {info.ProcessedFiles}/{info.TotalFiles}";
        }

        if (!string.IsNullOrWhiteSpace(info.CurrentFile))
        {
            return info.CurrentFile;
        }

        return info.Stage;
    }

    private static double ClampPercent(double value)
    {
        if (value < 0) return 0;
        if (value > 100) return 100;
        return value;
    }


    private async Task<LauncherDashboardResponseDto?> TryLoadDashboardAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await _authSessionService.GetDashboardAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _diagnostics.Warn("Dashboard", $"Launcher dashboard load failed: {ex.Message}");
            return null;
        }
    }
}
