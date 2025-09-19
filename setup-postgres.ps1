# Script de PowerShell para configurar PostgreSQL
# Sistema de Turnos Médicos

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CONFIGURACION DE POSTGRESQL" -ForegroundColor Cyan  
Write-Host "   Sistema de Turnos Medicos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$pgPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$pgUser = "postgres"

# Verificar si PostgreSQL existe
if (-not (Test-Path $pgPath)) {
    Write-Host "❌ ERROR: PostgreSQL no encontrado en $pgPath" -ForegroundColor Red
    Write-Host "Busca la carpeta de instalación de PostgreSQL" -ForegroundColor Yellow
    Read-Host "Presiona Enter para continuar"
    exit 1
}

Write-Host "1. Verificando conexión a PostgreSQL..." -ForegroundColor Green

# Solicitar contraseña
$password = Read-Host "Ingresa la contraseña del usuario postgres" -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# Verificar conexión
try {
    & $pgPath -U $pgUser -c "SELECT version();" -q
    if ($LASTEXITCODE -ne 0) {
        throw "Error de conexión"
    }
    Write-Host "✅ Conexión exitosa" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: No se pudo conectar a PostgreSQL" -ForegroundColor Red
    Write-Host "Verifica que:" -ForegroundColor Yellow
    Write-Host "- PostgreSQL esté ejecutándose" -ForegroundColor Yellow
    Write-Host "- La contraseña sea correcta" -ForegroundColor Yellow
    Write-Host "- El puerto 5432 esté disponible" -ForegroundColor Yellow
    Read-Host "Presiona Enter para continuar"
    exit 1
}

Write-Host ""
Write-Host "2. Creando base de datos doctor_calendar..." -ForegroundColor Green

# Eliminar base de datos existente (si existe)
& $pgPath -U $pgUser -c "DROP DATABASE IF EXISTS doctor_calendar;" 2>$null

# Crear nueva base de datos
& $pgPath -U $pgUser -c "CREATE DATABASE doctor_calendar;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: No se pudo crear la base de datos" -ForegroundColor Red
    Read-Host "Presiona Enter para continuar"
    exit 1
}

Write-Host "✅ Base de datos creada exitosamente" -ForegroundColor Green

Write-Host ""
Write-Host "3. Actualizando archivo .env..." -ForegroundColor Green

# Actualizar archivo .env con la contraseña
$envPath = "backend\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $newEnvContent = $envContent | ForEach-Object {
        if ($_ -match "^DB_PASSWORD=") {
            "DB_PASSWORD=$env:PGPASSWORD"
        } else {
            $_
        }
    }
    $newEnvContent | Set-Content $envPath
    Write-Host "✅ Archivo .env actualizado" -ForegroundColor Green
} else {
    Write-Host "⚠️  Archivo .env no encontrado, debes editarlo manualmente" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 ¡PostgreSQL configurado correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. cd backend" -ForegroundColor White
Write-Host "2. npm run migrate" -ForegroundColor White
Write-Host "3. npm run seed" -ForegroundColor White
Write-Host "4. npm run dev" -ForegroundColor White
Write-Host ""

# Limpiar contraseña de la variable de entorno
$env:PGPASSWORD = $null

Read-Host "Presiona Enter para continuar"
