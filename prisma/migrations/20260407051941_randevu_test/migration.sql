-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('magic_link', 'google', 'github');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "auth_provider" "AuthProvider" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "base_city_place_id" TEXT NOT NULL,
    "base_city_name" TEXT NOT NULL,
    "base_city_lat" DOUBLE PRECISION NOT NULL,
    "base_city_lng" DOUBLE PRECISION NOT NULL,
    "dietary_preferences" JSONB DEFAULT '{}',

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_seed_places" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "google_place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_seed_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferred_areas" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "neighborhood_name" TEXT NOT NULL,
    "bounds" JSONB NOT NULL,

    CONSTRAINT "user_preferred_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_places" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "google_place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cached_places" (
    "google_place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "types" TEXT[],
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_level" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "photo_references" TEXT[],
    "opening_hours" JSONB,
    "website" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "editorial_summary" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "city_place_id" TEXT NOT NULL,

    CONSTRAINT "cached_places_pkey" PRIMARY KEY ("google_place_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_link_tokens" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_seed_places_user_id_google_place_id_key" ON "user_seed_places"("user_id", "google_place_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferred_areas_user_id_neighborhood_name_key" ON "user_preferred_areas"("user_id", "neighborhood_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_places_user_id_google_place_id_key" ON "user_saved_places"("user_id", "google_place_id");

-- CreateIndex
CREATE UNIQUE INDEX "magic_link_tokens_token_key" ON "magic_link_tokens"("token");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_seed_places" ADD CONSTRAINT "user_seed_places_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferred_areas" ADD CONSTRAINT "user_preferred_areas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_places" ADD CONSTRAINT "user_saved_places_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
