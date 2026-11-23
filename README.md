# Homat — kitchen factory management (Phase 1)

Customers, quotes, orders and payments for the factory manager. Interface in Kurdish (Badini) and English; quotes and receipts also in Arabic.

## Run it on this computer

```powershell
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000. The first time, go to **/setup** and create the manager account.
You need the `SETUP_KEY` from the `.env` file.

## First-time setup (manager)

1. Enter the setup key, a username and a password (at least 10 characters).
2. Scan the QR code with an authenticator app (Google Authenticator or Microsoft Authenticator) and type the 6-digit code.
3. **Write the 8 recovery codes on paper** and keep them somewhere safe (not on the phone).

## If the phone is lost (recovery plan)

- Log in with the password, then type **one recovery code** instead of the 6-digit code. Each code works once.
- Then, while logged in, ask the person who maintains the system to reset two-step login so it can be set up on the new phone.
- If both the phone and the recovery codes are lost, the person who maintains the system must reset the account from the database.

## Money rules

- Each order has one currency, IQD or USD. Amounts are stored as whole dinars or cents.
- A payment in the other currency stores the exchange rate (IQD per 1 USD) used that day.
- Payments are never deleted. They can only be cancelled with a reason. Every change is in the **Activity log**.
- Cancelling an order keeps the money paid. Refunds are recorded as separate entries.

## Backups

- **Download backup** (in the menu) gives an Excel file of all customers, orders, payments, quotes, prices and the activity log. Download it weekly and keep it off the computer.
- Online, the hosting database also keeps daily backups (paid plan).

## Going online (not done yet)

1. Create accounts **in the factory's name**: GitHub, Vercel, and Supabase or Neon (paid plan, about $25/month).
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. On Vercel, set the environment variables from `.env.example`. Use new random values for `SESSION_SECRET` and `SETUP_KEY`, and set `APP_URL` to the real web address.
4. Deploy, run `npx prisma db push` against the online database, then do the first-time setup.

## Still to check before real use

- A native Badini speaker should read through `src/lib/i18n/ku.ts`.
- Fill in the factory name, phone and address in **Settings**.
- Enter the real price list and import the orders in progress (with what each customer has paid so far).
