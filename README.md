## ERP Lite (Amplify Only)

This project is now a minimal Amplify-only React app with exactly two pages:

- `Inventory`
- `Supplier`

There is no custom backend folder or custom API server. Data is stored directly through Amplify Data models.

## Data Models

Defined in `amplify/data/resource.ts`:

- `Inventory`
	- `sku`, `name`, `quantity`, `unit`, `location`, `unitCost`, `isActive`
- `Supplier`
	- `name`, `phone`, `email`, `address`, `notes`, `isActive`

Both models use authenticated access.

## App Structure

- `src/App.tsx`: two-page UI (Inventory + Supplier) with create/list/delete
- `src/App.css`: styles for the two-page UI
- `src/main.tsx`: Amplify configuration + app bootstrap

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploying to AWS

Use standard Amplify deployment workflow:
https://docs.amplify.aws/react/start/quickstart/#deploy-a-fullstack-app-to-aws

## License

This library is licensed under the MIT-0 License. See the LICENSE file.