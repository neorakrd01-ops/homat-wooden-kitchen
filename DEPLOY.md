# Putting Homat online

The code is ready. What's left needs accounts that belong to the factory. Allow about an hour.

## What it will cost (check the prices when you sign up)

| Service | What it does | Plan | Approx. cost |
|---|---|---|---|
| **Vercel** | Runs the website | **Pro** (the free Hobby plan is for personal, non-commercial use only) | about $20 / month |
| **Neon** | Stores the data (PostgreSQL) | **Launch** (lets you restore the data to any moment in the last 1–7 days) | usage-based, a few dollars / month for one manager |
| **GitHub** | Keeps the code, Vercel reads it from here | Free | $0 |
| Domain (optional) | e.g. `homat-kitchens.com` instead of `homat.vercel.app` | — | about $10–15 / year |

Use the **factory's email** for every account, and keep the passwords somewhere safe (a password manager, or on paper in the office).

## Steps

### 1. GitHub: store the code (you do this)
1. Create an account at github.com.
2. Create a **new private repository** named `homat-system`. Don't add a README or any files to it.
3. Send me the repository address (e.g. `https://github.com/<name>/homat-system`). I'll upload the code. A browser window will open once for you to sign in to GitHub.

### 2. Vercel: the website (you do this)
1. Create an account at vercel.com with "Continue with GitHub", and choose the **Pro** plan.
2. Click **Add New → Project** and import `homat-system`. Don't press Deploy yet.

### 3. Neon: the database (you do this, inside Vercel)
1. In the Vercel project go to **Storage → Create Database → Neon (Postgres)**.
2. Region: **Frankfurt (eu-central-1)**, the closest to Iraq. The website also runs in Frankfurt.
3. Connect it to the project. Vercel then fills in `DATABASE_URL` and `DATABASE_URL_UNPOOLED` by itself.
4. In Neon, choose the **Launch** plan and set the restore window to **7 days**.

### 4. Secret settings (you do this, I'll give you the values)
In Vercel, go to **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `SESSION_SECRET` | a new long random value; I'll generate it for you |
| `SETUP_KEY` | a new one-time key; I'll generate it for you |
| `APP_URL` | the website address, e.g. `https://homat.vercel.app` (no slash at the end) |

Then click **Deploy**. The first build also creates the database tables.

### 5. First login (the manager)
1. Open `https://<your-address>/setup` on the manager's phone.
2. Enter the setup key, a username and a password, then scan the QR code with Google Authenticator or Microsoft Authenticator.
3. **Write the 8 recovery codes on paper.** Keep them in the office, not on the phone.
4. Go to **Settings**: factory name, phone, address and the usual dollar rate.

### 6. Check everything works (together)
- Log in from the phone and from a PC.
- Add one test customer, make a quote, send it to your own WhatsApp and open the link.
- Click **Download backup** and open the Excel file.
- In Neon, try **Restore** to a few minutes earlier on a *branch* (not the main database) to see that it works.
- Test records can't be deleted (that's on purpose), so give the test customer a clear name like "TEST – do not use" and cancel its order afterwards.

### 7. Real data
1. **Price list:** enter the standard items.
2. **Import old orders:** every kitchen in progress, with what each customer has already paid. Then compare the dashboard's "Customers owe" total with the paper records.
3. From now on, every new quote and payment goes into the system first.

## Routine
- **Every week:** click **Download backup** and keep the file outside the phone and the computer (USB stick or a second email).
- **If the phone is lost:** log in with a recovery code, then ask for two-step login to be reset.
- **Updates:** when the code changes, Vercel redeploys automatically after the change is uploaded to GitHub.

## Cheaper option (if $20+/month is too much)
**Railway** (railway.com) can run both the website and the database for about $5 / month plus usage. But its cheapest plan may not include automatic database backups, so you'd rely on the weekly Excel download. If you choose this, tell me and I'll adjust the steps.
