# Contribuindo para o pg-backup-sdk

Obrigado pelo interesse em melhorar o projeto. Correções, testes, documentação e relatórios de bugs reproduzíveis são bem-vindos.

## Antes de começar

- Verifique as [issues existentes](https://github.com/guio11221/pg-backup-sdk/issues) para evitar trabalho duplicado.
- Para mudanças grandes ou que alterem o formato dos backups, abra uma issue para discutir o impacto.
- **Nunca envie senhas, strings de conexão, arquivos `.env` ou dumps de produção.** Use dados fictícios em testes e relatórios.

## Preparar o ambiente

Requisitos: Node.js >= 20, npm e, para testes manuais, ferramentas cliente PostgreSQL.

```bash
git clone https://github.com/guio11221/pg-backup-sdk.git
cd pg-backup-sdk
npm ci
npm run build
npm test
```

O conjunto de testes automatizados é baseado no test runner nativo do Node.js. Não é necessário ter um servidor PostgreSQL ativo para executar o `npm test` atual.

Para verificar o conteúdo do pacote antes de publicar:

```bash
npm run build
npm pack --dry-run
```

## Fluxo de contribuição

1. Faça um fork e crie uma branch descritiva (`fix/...`, `feat/...` ou `docs/...`).
2. Inclua um teste de regressão para correções de bugs quando possível.
3. Execute `npm run build` e `npm test` antes de abrir o PR.
4. Explique o problema, a mudança proposta, como reproduzir e eventuais impactos em compatibilidade.
5. Aguarde o resultado do GitHub Actions e trate os comentários da revisão.

## Áreas relevantes

- `src/backup.ts`: coordenação do backup por banco.
- `src/dump-process.ts`: execução do `pg_dump` e escrita do arquivo.
- `src/dump-validation.ts`: validação básica do formato custom PostgreSQL.
- `src/retention.ts`: remoção de backups expirados.
- `src/scheduler.ts`: execução agendada e prevenção de sobreposição no processo.
- `test/`: testes automatizados de regressão.

## Segurança e colaboração

Se você descobrir um risco de divulgação ou perda de dados, **não publique credenciais nem dumps** em issues. Descreva um cenário mínimo usando dados sintéticos; para uma vulnerabilidade explorável não divulgada, procure um canal privado com o mantenedor antes de abrir uma issue pública.

Contribuições com coautoria genuína podem usar o trailer convencional `Co-authored-by` para atribuir corretamente o trabalho de todas as pessoas envolvidas. Não atribua coautoria a quem não participou.

## Compatibilidade

- Não mude nomes e formato dos arquivos de backup sem considerar a política de retenção e os backups anteriores.
- Não ignore falhas do `pg_dump`; preserve o código de saída e limpe arquivos parciais.
- Testes devem ser determinísticos e não depender de recursos ou credenciais de produção.
