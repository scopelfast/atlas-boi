# Cria o banco atlas_boi_db no PostgreSQL local (porta 5432).
# Requer psql e usuario com permissao CREATE DATABASE (ex.: postgres ou atlas_erp_user).

param(
    [string]$PgUser = "postgres",
    [string]$PgPassword = "",
    [string]$PgHost = "localhost",
    [int]$PgPort = 5432,
    [string]$DbName = "atlas_boi_db",
    [string]$AppUser = "atlas_boi_user",
    [string]$AppPassword = "Admin@123"
)

$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $psql)) {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $psql = $found.FullName } else { throw "psql.exe nao encontrado. Instale PostgreSQL ou ajuste o caminho." }
}

if ($PgPassword) { $env:PGPASSWORD = $PgPassword }

Write-Host "Criando banco $DbName em ${PgHost}:${PgPort}..."

$sql = @"
SELECT 'CREATE DATABASE $DbName' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DbName')\gexec
DO `$`$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$AppUser') THEN
    CREATE ROLE $AppUser WITH LOGIN PASSWORD '$AppPassword';
  END IF;
END `$`$;
GRANT ALL PRIVILEGES ON DATABASE $DbName TO $AppUser;
"@

$sql | & $psql -U $PgUser -h $PgHost -p $PgPort -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Se pediu senha ou falhou, tente manualmente no pgAdmin ou:"
    Write-Host "  psql -U postgres -c `"CREATE DATABASE atlas_boi_db;`""
    exit 1
}

# Permissoes no schema public (PG 15+)
$grantSql = @"
GRANT ALL ON SCHEMA public TO $AppUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $AppUser;
"@
$grantSql | & $psql -U $PgUser -h $PgHost -p $PgPort -d $DbName -v ON_ERROR_STOP=1

Write-Host "OK — banco $DbName pronto."
Write-Host "DATABASE_URL=postgresql://${AppUser}:Admin%40123@${PgHost}:${PgPort}/${DbName}"
