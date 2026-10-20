# Fotos do casamento por QR code

App completo: anfitri\u00e3o cria o evento e gera o QR, convidados escaneiam e sobem fotos direto do navegador do celular (sem instalar app), galeria atualiza sozinha.

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma + PostgreSQL
- Storage de imagens compat\u00edvel com S3 (recomendo Cloudflare R2: sem custo de sa\u00edda/egress, ideal pra esse caso de uso)
- `sharp` pra gerar thumbnail e comprimir a imagem original no upload

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL e as chaves S3/R2
npx prisma migrate dev --name init
npm run dev
```

Abra `http://localhost:3000`, crie um evento e vai gerar o QR apontando pra `/e/<slug>/upload`.

## Planos e pagamentos

- Gratuito: até 100 fotos por evento.
- Completo: pagamento único de R$ 49,90 por evento, com limite de 2.000 fotos.
- Eventos existentes antes da migração de cobrança mantêm o limite que já tinham.
- O checkout usa Stripe Checkout. Configure `STRIPE_SECRET_KEY` e `NEXT_PUBLIC_APP_URL` no ambiente da aplicação. Para a produção na Vercel, adicione também `STRIPE_WEBHOOK_SECRET`.
- No painel Stripe, crie um webhook para `/api/billing/webhook` ouvindo `checkout.session.completed` e `checkout.session.async_payment_succeeded`.
- Para testar localmente, execute `stripe listen --forward-to localhost:3000/api/billing/webhook` e use o `whsec_...` exibido pelo Stripe CLI como `STRIPE_WEBHOOK_SECRET`. Use chaves de teste do Stripe durante o desenvolvimento.
- O evento pago só fica ativo depois da confirmação do pagamento pelo Stripe; não use uma página de retorno como prova de pagamento.

## Fluxo

1. `/` \u2014 anfitri\u00e3o digita o nome do evento, o app cria o registro no banco e gera o QR (`lib` usa a lib `qrcode`).
2. `/e/[slug]/upload` \u2014 p\u00e1gina que abre ao escanear o QR. Bot\u00e3o dispara `<input type="file" capture="environment">`, que no celular abre a c\u00e2mera nativa ou a galeria. Fotos acima de 4 MB s\u00e3o reduzidas no navegador para caber no limite de requisi\u00e3o da Vercel; o arquivo original pode ter at\u00e9 15 MB.
3. `POST /api/events/[slug]/photos` \u2014 recebe a imagem, redimensiona e comprime com `sharp`, sobe original + thumbnail pro bucket e grava no Postgres.
4. `/gallery/[slug]` \u2014 faz polling a cada 5s na API e mostra a grade de fotos. Pra algo mais real-time, d\u00e1 pra trocar o polling por Server-Sent Events ou Pusher/Ably sem mudar o resto da arquitetura.

## Onde hospedar

- App: Vercel (mais simples pra Next.js) ou qualquer host Node.
- Banco: Neon, Supabase ou Railway (Postgres gerenciado).
- Storage: Cloudflare R2 (sem custo de egress \u2014 importante porque cada convidado vai *ver* a galeria in\u00e9meras vezes).

## Pr\u00f3ximos passos sugeridos

- P\u00e1gina de "moderar fotos" pro anfitri\u00e3o aprovar antes de aparecer na galeria p\u00fablica.
- Limite de fotos por convidado (hoje s\u00f3 h\u00e1 limite total por evento, em `event.photoLimit`).
- Download em lote (zip) de todas as fotos ap\u00f3s o evento.
- Autenticação simples do anfitri\u00e3o (hoje qualquer um com o slug do evento acessa `/gallery/[slug]`).
