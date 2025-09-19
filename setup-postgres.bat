@echo off
echo ========================================
echo   CONFIGURACION DE POSTGRESQL
echo   Sistema de Turnos Medicos
echo ========================================
echo.

set PGPATH=C:\Program Files\PostgreSQL\17\bin
set PGUSER=postgres

echo 1. Verificando conexion a PostgreSQL...
"%PGPATH%\psql.exe" -U %PGUSER% -c "SELECT version();" -q

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: No se pudo conectar a PostgreSQL
    echo Verifica que:
    echo - PostgreSQL este ejecutandose
    echo - La contraseña sea correcta
    echo - El puerto 5432 este disponible
    pause
    exit /b 1
)

echo.
echo 2. Creando base de datos doctor_calendar...
"%PGPATH%\psql.exe" -U %PGUSER% -c "DROP DATABASE IF EXISTS doctor_calendar;"
"%PGPATH%\psql.exe" -U %PGUSER% -c "CREATE DATABASE doctor_calendar;"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudo crear la base de datos
    pause
    exit /b 1
)

echo.
echo 3. Verificando base de datos creada...
"%PGPATH%\psql.exe" -U %PGUSER% -c "\l doctor_calendar" -q

echo.
echo ✅ ¡PostgreSQL configurado correctamente!
echo.
echo Proximos pasos:
echo 1. Editar el archivo backend\.env con tu contraseña
echo 2. Ejecutar: cd backend
echo 3. Ejecutar: npm run migrate
echo 4. Ejecutar: npm run seed
echo 5. Ejecutar: npm run dev
echo.
pause
