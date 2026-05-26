import { createApp } from "./app";

const PORT = Number(process.env.PORT || 4001);

const app = createApp();

app.listen(PORT, () => {
  console.log(`Role1 backend listening on port ${PORT}`);
});
