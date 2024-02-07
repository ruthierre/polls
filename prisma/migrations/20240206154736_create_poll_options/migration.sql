-- CreateTable
CREATE TABLE "poll-options" (
    "id" TEXT NOT NULL,
    "tittle" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,

    CONSTRAINT "poll-options_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "poll-options" ADD CONSTRAINT "poll-options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "poll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
