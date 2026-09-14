# Darkariont Security Test Lab

Laboratório **isolado** de testes defensivos do `darkariontMeuSite`, inspirado na separação usada pelo repositório Modelo.

Ele não é importado pelo site, não altera o runtime de produção e não executa brute force, exploração destrutiva, persistência ou exfiltração.

## O que testa

- regras do Firestore: autenticação, isolamento entre usuários e privilégios administrativos;
- regras do Storage: autenticação, ownership, tipo/tamanho de upload e caminhos não autorizados;
- análise estática do repositório para padrões de risco (segredos privados, `eval`, HTML perigoso e URLs HTTP);
- gera resumo PASS / FAIL / WARN e recomendações.

## Estrutura

- `config/security-targets.json`: manifesto explícito do escopo autorizado;
- `scripts/static-audit.mjs`: auditoria estática sem rede;
- `tests/firestore.rules.test.mjs`: testes locais das regras Firestore;
- `tests/storage.rules.test.mjs`: testes locais das regras Storage;
- `run-all.mjs`: runner e relatório consolidado;
- `.github/workflows/security-controlled-test.yml`: CI manual/PR, sem tocar no deploy.

## Execução local

Requer Node 20+ e Firebase Emulator Suite disponível.

```bash
cd security-test
npm install
npm run test
```

Os testes de Rules usam apenas emuladores locais. Nenhuma credencial de produção deve ser adicionada à pasta.

## Resultado

O runner grava `security-test/reports/latest.json`. Falhas de controle de acesso fazem o job falhar; achados estáticos de revisão aparecem como WARN.

## Limites operacionais

Este laboratório só deve ser usado contra este projeto e seus emuladores/ambientes explicitamente autorizados. Não adicione scanners de terceiros, listas de senhas, brute force ou alvos externos ao manifesto.