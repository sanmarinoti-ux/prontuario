# Prontuário RH — Concessionária

Sistema web inicial para uma concessionária, com pesquisa por nome/matrícula, cadastro de funcionários e histórico de anotações profissionais.

## Tecnologias
- Next.js + React + TypeScript
- Supabase (PostgreSQL)
- Hospedagem sugerida: Vercel

## Executar localmente
1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave pública/anon do projeto Supabase.
4. Execute o arquivo `supabase/schema.sql` no SQL Editor do Supabase.
5. Crie manualmente as contas autorizadas de RH no Supabase Authentication.
6. Execute `npm run dev` e acesse http://localhost:3000.

## Segurança — antes de dados reais
Este é um MVP de desenvolvimento, não uma implantação pronta para produção. As políticas SQL atuais permitem acesso a qualquer usuário autenticado do projeto. Antes de inserir dados reais, implemente autorização por perfil RH no banco, login e controle de sessão, MFA, auditoria de leitura/alteração/exportação, backups, retenção e revisão de privacidade conforme LGPD. Não registre dados pessoais sensíveis desnecessários. Use apenas dados fictícios durante testes.
