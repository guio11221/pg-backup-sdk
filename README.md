# pg-backup-sdk

SDK open source em **Node.js + TypeScript** para criar backups automáticos de bancos **PostgreSQL** usando `pg_dump`.

O pacote pode ser usado de duas formas:

1. **Como CLI** no terminal.
2. **Como módulo/SDK** importado dentro de outro projeto Node.js.

Ele lista os bancos PostgreSQL, cria uma pasta separada para cada banco e salva os arquivos `.dump` no formato custom do PostgreSQL.

---

## Recursos

* Backup automático com CRON
* Backup manual via CLI
* Uso como módulo/SDK em outro projeto
* Uma pasta separada por banco
* Retenção automática de backups antigos
* Ignora bancos internos por padrão
* Permite filtrar bancos específicos
* Usa `pg_dump --format custom`
* Compatível com Node.js, Docker e systemd
* Escrito em TypeScript
* Pronto para projetos open source

---

## Instalação

### Instalar em um projeto

```bash
npm install pg-backup-sdk
```

### Instalar globalmente como CLI

```bash
npm install -g pg-backup-sdk
```

---

## Requisitos

* Node.js 20+
* PostgreSQL client instalado na máquina
* Binário `pg_dump` disponível no PATH ou configurado no `.env`

### Ubuntu/Debian

```bash
sudo apt install postgresql-client
```

### Windows

Configure o caminho do `pg_dump` no `.env`:

```env
PG_DUMP_BIN=C:\Program Files\PostgreSQL\16\bin\pg_dump.exe
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto:

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

---

## Variáveis de ambiente

| Variável                | Descrição                                      | Padrão                         |
| ----------------------- | ---------------------------------------------- | ------------------------------ |
| `PG_HOST`               | Host do PostgreSQL                             | obrigatório                    |
| `PG_PORT`               | Porta do PostgreSQL                            | `5432`                         |
| `PG_USER`               | Usuário PostgreSQL                             | obrigatório                    |
| `PG_PASSWORD`           | Senha do PostgreSQL                            | obrigatório                    |
| `PG_ADMIN_DATABASE`     | Banco usado para listar os databases           | `postgres`                     |
| `BACKUP_DIR`            | Pasta raiz onde os backups serão salvos        | `./backups`                    |
| `BACKUP_CRON`           | Expressão CRON usada pelo scheduler            | `0 2 * * *`                    |
| `BACKUP_RETENTION_DAYS` | Quantidade de dias para manter backups antigos | `7`                            |
| `PG_DUMP_BIN`           | Caminho do binário `pg_dump`                   | `pg_dump`                      |
| `IGNORE_DATABASES`      | Bancos ignorados separados por vírgula         | `postgres,template0,template1` |
| `ONLY_DATABASES`        | Bancos permitidos separados por vírgula        | vazio                          |

---

## Como funciona a retenção

Exemplo:

```env
BACKUP_CRON=0 2 * * *
BACKUP_RETENTION_DAYS=7
```

Isso significa:

* executa backup todos os dias às `02:00`;
* mantém os backups dos últimos `7` dias;
* backups mais antigos são removidos automaticamente.

---

## Exemplos de CRON

### Todo dia às 02:00

```env
BACKUP_CRON=0 2 * * *
```

### Todo dia à meia-noite

```env
BACKUP_CRON=0 0 * * *
```

### Todo domingo às 03:00

```env
BACKUP_CRON=0 3 * * 0
```

### A cada 1 minuto, apenas para teste

```env
BACKUP_CRON=* * * * *
```

---

# Uso como CLI

Depois de instalar globalmente:

```bash
npm install -g pg-backup-sdk
```

## Executar backup manual

```bash
pg-backup-sdk --now
```

## Rodar scheduler

```bash
pg-backup-sdk
```

O scheduler ficará rodando e executará os backups conforme o valor de `BACKUP_CRON`.

---

# Uso como módulo/SDK

Você também pode importar o `pg-backup-sdk` dentro de outro projeto Node.js ou TypeScript.

## Backup manual dentro do código

```ts
import { runBackupJob } from 'pg-backup-sdk';

async function main(): Promise<void> {
  await runBackupJob();
}

main().catch((error) => {
  console.error('Erro ao executar backup:', error);
  process.exit(1);
});
```

---

## Iniciar scheduler dentro de outro projeto

```ts
import { startBackupScheduler } from 'pg-backup-sdk';

startBackupScheduler();
```

Esse código inicia o agendador de backups usando a expressão definida em:

```env
BACKUP_CRON=0 2 * * *
```

---

## Exemplo usando Express

```ts
import express from 'express';
import { runBackupJob, startBackupScheduler } from 'pg-backup-sdk';

const app = express();

app.use(express.json());

startBackupScheduler();

app.post('/admin/backups/run', async (req, res) => {
  try {
    await runBackupJob();

    return res.status(200).json({
      success: true,
      message: 'Backup executado com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao executar backup',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
```

---

## Exemplo usando NestJS

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { runBackupJob, startBackupScheduler } from 'pg-backup-sdk';

@Injectable()
export class BackupService implements OnModuleInit {
  onModuleInit(): void {
    startBackupScheduler();
  }

  async runManualBackup(): Promise<void> {
    await runBackupJob();
  }
}
```

Controller:

```ts
import { Controller, Post } from '@nestjs/common';
import { BackupService } from './backup.service';

@Controller('admin/backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('run')
  async runBackup() {
    await this.backupService.runManualBackup();

    return {
      success: true,
      message: 'Backup executado com sucesso'
    };
  }
}
```

---

## Exemplo usando Fastify

```ts
import Fastify from 'fastify';
import { runBackupJob, startBackupScheduler } from 'pg-backup-sdk';

const app = Fastify();

startBackupScheduler();

app.post('/admin/backups/run', async () => {
  await runBackupJob();

  return {
    success: true,
    message: 'Backup executado com sucesso'
  };
});

await app.listen({
  port: 3000,
  host: '0.0.0.0'
});
```

---

## Estrutura de backups gerada

```txt
backups/
├─ financeiro/
│  └─ financeiro_2026-06-25_02-00-00.dump
├─ pmgestao/
│  └─ pmgestao_2026-06-25_02-00-00.dump
└─ sistema_escolar/
   └─ sistema_escolar_2026-06-25_02-00-00.dump
```

Cada banco recebe sua própria pasta.

---

## Filtros de bancos

### Backup de todos os bancos, exceto internos

```env
IGNORE_DATABASES=postgres,template0,template1
ONLY_DATABASES=
```

### Backup apenas de bancos específicos

```env
ONLY_DATABASES=sistema_escolar,financeiro,pmgestao
```

### Ignorar banco de teste

```env
IGNORE_DATABASES=postgres,template0,template1,test_db
```

Quando `ONLY_DATABASES` estiver preenchido, apenas os bancos listados serão considerados para backup.

---

## Restaurar backup

Como os arquivos são gerados no formato custom do PostgreSQL, use `pg_restore`.

### Criar novo banco e restaurar

```bash
createdb -U postgres nome_banco_restaurado
pg_restore -U postgres -d nome_banco_restaurado ./backups/pmgestao/pmgestao_2026-06-25_02-00-00.dump
```

### Restaurar limpando objetos existentes

```bash
pg_restore -U postgres --clean --if-exists -d nome_banco ./backups/pmgestao/pmgestao_2026-06-25_02-00-00.dump
```

---

## Desenvolvimento local

Clone o repositório:

```bash
git clone https://github.com/guio11221/pg-backup-sdk.git
cd pg-backup-sdk
npm install
cp .env.example .env
```

Rodar em desenvolvimento:

```bash
npm run dev
```

Executar backup manual em desenvolvimento:

```bash
npm run backup
```

Build de produção:

```bash
npm run build
```

Rodar build:

```bash
npm start
```

---

## Docker

### Build

```bash
docker build -t pg-backup-sdk .
```

### Run

```bash
docker run --rm \
  --env-file .env \
  -v $(pwd)/backups:/app/backups \
  pg-backup-sdk
```

### Docker Compose

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

---

## systemd

Copie o projeto para `/opt/pg-backup-sdk`.

```bash
npm install
npm run build
sudo cp systemd.example.service /etc/systemd/system/pg-backup-sdk.service
sudo systemctl daemon-reload
sudo systemctl enable pg-backup-sdk
sudo systemctl start pg-backup-sdk
```

Logs:

```bash
journalctl -u pg-backup-sdk -f
```

---

## Publicar no npm

Atualize a versão:

```bash
npm version patch
```

Publique:

```bash
npm publish
```

Verificar versão publicada:

```bash
npm view pg-backup-sdk version
```

Ver todas as versões:

```bash
npm view pg-backup-sdk versions
```

---

## Publicar no GitHub

```bash
git init
git add .
git commit -m "Initial open source PostgreSQL backup SDK"
git branch -M main
git remote add origin https://github.com/guio11221/pg-backup-sdk.git
git push -u origin main
```

---

## Segurança

* Não suba o arquivo `.env` para o GitHub.
* Use um usuário PostgreSQL com permissões adequadas para backup.
* Evite usar o superusuário `postgres` em produção.
* Salve backups em disco seguro.
* Para produção, considere copiar os backups para outro servidor, S3, NAS ou storage externo.
* Proteja rotas manuais de backup com autenticação e autorização.
* Não exponha endpoints de backup publicamente sem proteção.

---

## Licença

MIT.
