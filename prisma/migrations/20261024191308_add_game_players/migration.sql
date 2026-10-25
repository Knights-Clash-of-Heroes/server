-- CreateTable
CREATE TABLE "game_players" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "platform_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "session_key" TEXT NOT NULL,
    "state" JSONB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "game_players_platform_id_key" ON "game_players"("platform_id");
