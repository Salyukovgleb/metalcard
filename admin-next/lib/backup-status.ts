import fs from "node:fs/promises";

export type BackupStatus = {
  ok: boolean;
  label: string;
  file: string;
  sizeHuman: string;
  finishedAtRaw: string;
};

export async function readBackupStatus(): Promise<BackupStatus> {
  const path = (process.env.BACKUP_STATUS_FILE ?? "/backup-status/last_backup.json").trim();
  if (!path) {
    return {
      ok: false,
      label: "Файл статуса бэкапа не настроен",
      file: "",
      sizeHuman: "",
      finishedAtRaw: "",
    };
  }

  try {
    const raw = JSON.parse(await fs.readFile(path, "utf-8")) as {
      ok?: unknown;
      label?: unknown;
      file?: unknown;
      size_human?: unknown;
      finished_at?: unknown;
    };

    return {
      ok: Boolean(raw.ok),
      label: typeof raw.label === "string" && raw.label ? raw.label : raw.ok ? "Успешно" : "Ошибка",
      file: typeof raw.file === "string" ? raw.file : "",
      sizeHuman: typeof raw.size_human === "string" ? raw.size_human : "",
      finishedAtRaw: typeof raw.finished_at === "string" ? raw.finished_at : "",
    };
  } catch {
    return {
      ok: false,
      label: "Бэкап еще не выполнен",
      file: "",
      sizeHuman: "",
      finishedAtRaw: "",
    };
  }
}
