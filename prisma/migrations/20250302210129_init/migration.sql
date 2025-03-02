-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(6),
    "image" TEXT,
    "lastFullAuth" TIMESTAMP(6),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
