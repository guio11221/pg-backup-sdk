# pg-backup-module

Modulo open source em Node.js + TypeScript para fazer backups automaticos de bancos PostgreSQL usando `pg_dump`.

Ele cria uma pasta separada para cada banco e salva os arquivos `.dump` no formato custom do PostgreSQL.

## Recursos

- Backup automatico com CRON
- Backup manual via CLI
- Uma pasta separada por banco
- Retencao automatica de backups antigos
- Ignora bancos internos por padrao
- Permite filtrar bancos especificos
- Usa `pg_dump --format custom`
- Pronto para rodar com Node.js, Docker ou systemd

## Estrutura gerada

```txt
backups/
├─ financeiro/
│  └─ financeiro_2026-06-25_02-00-00.dump
├─ pmgestao/
│  └─ pmgestao_2026-06-25_02-00-00.dump
└─ sistema_escolar/
   └─ sistema_escolar_2026-06-25_02-00-00.dump
```

## Requisitos

- Node.js 20+
- PostgreSQL client instalado na maquina
- Binario `pg_dump` disponivel no PATH ou configurado no `.env`

Ubuntu/Debian:

```bash
sudo apt install postgresql-client
```

Windows:

```env
PG_DUMP_BIN=C:\Program Files\PostgreSQL\16\bin\pg_dump.exe
```

## Instalacao

```bash
git clone https://github.com/guio11221/pg-backup-module.git
cd pg-backup-module
npm install
cp .env.example .env
```

Configure o `.env`:

```env
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_ADMIN_DATABASE=postgres
BACKUP_DIR=./backups
BACKUP_CRON=0 2 * * *
BACKUP_RETENTION_DAYS=7
PG_DUMP_BIN=pg_dump
IGNORE_DATABASES=postgres,template0,template1
ONLY_DATABASES=
```

## Rodar backup manual

```bash
npm run backup
```

Ou:

```bash
npm run dev -- --now
```

## Rodar scheduler

```bash
npm run dev
```

Build de producao:

```bash
npm run build
npm start
```

## Variaveis de ambiente

| Variavel | Descricao | Padrao |
|---|---|---|
| `PG_HOST` | Host do PostgreSQL | obrigatorio |
| `PG_PORT` | Porta do PostgreSQL | `5432` |
| `PG_USER` | Usuario PostgreSQL | obrigatorio |
| `PG_PASSWORD` | Senha PostgreSQL | obrigatorio |
| `PG_ADMIN_DATABASE` | Banco usado para listar databases | `postgres` |
| `BACKUP_DIR` | Pasta raiz dos backups | `./backups` |
| `BACKUP_CRON` | Expressao CRON do scheduler | `0 2 * * *` |
| `BACKUP_RETENTION_DAYS` | Dias de retencao | `7` |
| `PG_DUMP_BIN` | Caminho do binario pg_dump | `pg_dump` |
| `IGNORE_DATABASES` | Bancos ignorados separados por virgula | `postgres,template0,template1` |
| `ONLY_DATABASES` | Bancos permitidos separados por virgula | vazio |

## Exemplos de filtro

Backup de todos os bancos exceto internos:

```env
IGNORE_DATABASES=postgres,template0,template1
ONLY_DATABASES=
```

Backup apenas de alguns bancos:

```env
ONLY_DATABASES=sistema_escolar,financeiro,pmgestao
```

Ignorar banco de teste:

```env
IGNORE_DATABASES=postgres,template0,template1,test_db
```

## Restaurar backup

Criar novo banco e restaurar:

```bash
createdb -U postgres nome_banco_restaurado
pg_restore -U postgres -d nome_banco_restaurado ./backups/pmgestao/pmgestao_2026-06-25_02-00-00.dump
```

Restaurar limpando objetos existentes:

```bash
pg_restore -U postgres --clean --if-exists -d nome_banco ./backups/pmgestao/pmgestao_2026-06-25_02-00-00.dump
```

## Docker

Build:

```bash
docker build -t pg-backup-module .
```

Run:

```bash
docker run --rm \
  --env-file .env \
  -v $(pwd)/backups:/app/backups \
  pg-backup-module
```

Com compose:

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

## systemd

Copie o projeto para `/opt/pg-backup-module`.

```bash
npm install
npm run build
sudo cp systemd.example.service /etc/systemd/system/pg-backup-module.service
sudo systemctl daemon-reload
sudo systemctl enable pg-backup-module
sudo systemctl start pg-backup-module
```

Logs:

```bash
journalctl -u pg-backup-module -f
```

## Como publicar no GitHub

```bash
git init
git add .
git commit -m "Initial open source PostgreSQL backup module"
git branch -M main
git remote add origin https://github.com/guio11221/pg-backup-module.git
git push -u origin main
```

## Seguranca

- Nao suba o arquivo `.env` para o GitHub.
- Use usuario PostgreSQL com permissoes adequadas para backup.
- Salve backups em disco seguro.
- Para producao, considere copiar os backups para outro servidor, S3, NAS ou storage externo.

## Licenca

MIT.
