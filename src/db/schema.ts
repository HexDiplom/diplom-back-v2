import { pgTable, pgEnum } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";

//
// Better Auth Tables (DON'T CHANGE IT WITHOUT REFERENCE TO BETTER AUTH DOCS!)
//

export const user = pgTable("user", {
	id: t.text("id").primaryKey(),
	name: t.text("name").notNull(),
	username: t.varchar("username", { length: 255 }).notNull().unique(),
	displayUsername: t.text("display_username"),
	email: t.varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: t.boolean("email_verified").notNull(),
	image: t.text("image"),
	role: t.text("role"),
	banned: t.boolean("banned"),
	banReason: t.text("ban_reason"),
	banExpires: t.timestamp("ban_expires", { precision: 6, withTimezone: true }),
	createdAt: t.timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
	updatedAt: t.timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
});

export const session = pgTable("session", {
	id: t.text("id").primaryKey(),
	userId: t.text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	token: t.varchar("token", { length: 255 }).notNull().unique(),
	expiresAt: t.timestamp("expires_at", { precision: 6, withTimezone: true }).notNull(),
	ipAddress: t.text("ip_address"),
	userAgent: t.text("user_agent"),
	impersonatedBy: t.text("impersonated_by"),
	createdAt: t.timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
	updatedAt: t.timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
});

export const account = pgTable("account", {
	id: t.text("id").primaryKey(),
	userId: t.text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accountId: t.text("account_id").notNull(),
	providerId: t.text("provider_id").notNull(),
	accessToken: t.text("access_token"),
	refreshToken: t.text("refresh_token"),
	accessTokenExpiresAt: t.timestamp("access_token_expires_at", { precision: 6, withTimezone: true }),
	refreshTokenExpiresAt: t.timestamp("refresh_token_expires_at", { precision: 6, withTimezone: true }),
	scope: t.text("scope"),
	idToken: t.text("id_token"),
	password: t.text("password"),
	createdAt: t.timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
	updatedAt: t.timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
});

export const verification = pgTable("verification", {
	id: t.text("id").primaryKey(),
	identifier: t.text("identifier").notNull(),
	value: t.text("value").notNull(),
	expiresAt: t.timestamp("expires_at", { precision: 6, withTimezone: true }).notNull(),
	createdAt: t.timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
	updatedAt: t.timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
});

//
// Enums
//

export const animeFormat = pgEnum("anime_format", ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "OTHER"]);

export const animeStatus = pgEnum("anime_status", ["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"]);

export const animeSeason = pgEnum("anime_season", ["WINTER", "SPRING", "SUMMER", "FALL"]);

export const animeSource = pgEnum("anime_source", ["ORIGINAL", "MANGA", "LIGHT_NOVEL", "VISUAL_NOVEL", "VIDEO_GAME", "OTHER"])

//
// Anime Tables
//

export const anime = pgTable("anime", {
	id: t.serial("id").primaryKey(),
	format: animeFormat("format").notNull().default("OTHER"),
	status: animeStatus("status").notNull(),
	description: t.text("description"),

	//startDate
	startDateDay: t.integer("start_date_day"),
	startDateMonth: t.integer("start_date_month"),
	startDateYear: t.integer("start_date_year"),

	//endDate
	endDateDay: t.integer("end_date_day"),
	endDateMonth: t.integer("end_date_month"),
	endDateYear: t.integer("end_date_year"),

	season: animeSeason("season"),
	seasonYear: t.integer("season_year"),
	episodes: t.integer("episodes"),
	duration: t.integer("duration"),
	source: animeSource("source"),
	bannerImage: t.text("banner_image"),
	genres: t.text("genres").array(),
	tags: t.text("tags").array(),
	studioId: t.integer("studio_id").references(() => studio.id, { onDelete: "set null" }),
	isAdult: t.boolean("is_adult").notNull().default(false),

	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const animeTitle = pgTable("anime_title", {
	animeId: t.integer("anime_id").notNull().references(() => anime.id, { onDelete: "cascade" }).primaryKey(),
	romaji: t.text("romaji").notNull(),
	russian: t.text("russian").notNull(),
	native: t.text("native"),
	english: t.text("english"),
	other: t.text("other").array(),
});

export const animeTrailer = pgTable("anime_trailer", {
	id: t.serial("id").primaryKey(),
	animeId: t.integer("anime_id").notNull().references(() => anime.id, { onDelete: "cascade" }),
	videoUrl: t.text("video_url").notNull(),
	thumbnailUrl: t.text("thumbnail_url"),
});

export const animeCoverImage = pgTable("anime_cover_image", {
	animeId: t.integer("anime_id").notNull().references(() => anime.id, { onDelete: "cascade" }).primaryKey(),
	extraLarge: t.text("extra_large"),
	large: t.text("large"),
	medium: t.text("medium").notNull(),
	color: t.text("color"),
});

export const animeRelation = pgTable("anime_relation", {
	id: t.serial("id").primaryKey(),
	animeId: t.integer("anime_id").notNull().references(() => anime.id, { onDelete: "cascade" }),
	relatedAnimeId: t.integer("related_anime_id").notNull().references(() => anime.id, { onDelete: "cascade" }),
	relationType: t.text("relation_type").notNull(),
});

export const studio = pgTable("studio", {
	id: t.serial("id").primaryKey(),
	logo: t.text("logo"),
});

export const episode = pgTable("episode", {
	id: t.uuid("id").defaultRandom().primaryKey(),
	animeId: t.integer("anime_id").notNull().references(() => anime.id, { onDelete: "cascade" }),
	number: t.integer("number").notNull(),
	duration: t.text("duration"),
	thumbnailUrl: t.text("thumbnail_url"),
	name: t.text("name"),
	description: t.text("description"),
	isFiller: t.boolean("is_filler").default(false),
})

export const episodeVideo = pgTable("episode_video", {
  id: t.uuid("id").defaultRandom().primaryKey(),
  episodeId: t.uuid("episode_id").notNull().references(() => episode.id),

  manifestUrl: t.text("manifest_url").notNull(),

  container: t.text("container").default("fmp4"),

  availableResolutions: t.text("available_resolutions").array(),

  voiceoverName: t.text("voiceover_name"),
  status: t.text("status"),
});

//
// Relations
//

export const animeRelations = relations(anime, ({ one, many }) => ({
  title: one(animeTitle, {
    fields: [anime.id],
    references: [animeTitle.animeId],
  }),
  coverImage: one(animeCoverImage, {
    fields: [anime.id],
    references: [animeCoverImage.animeId],
  }),
  studio: one(studio, {
    fields: [anime.studioId],
    references: [studio.id],
  }),
  trailers: many(animeTrailer),
  episodes: many(episode),
  relations: many(animeRelation, { relationName: "anime_to_related" }),
}));

export const animeTitleRelations = relations(animeTitle, ({ one }) => ({
  anime: one(anime, {
    fields: [animeTitle.animeId],
    references: [anime.id],
  }),
}));

export const animeTrailerRelations = relations(animeTrailer, ({ one }) => ({
  anime: one(anime, {
    fields: [animeTrailer.animeId],
    references: [anime.id],
  }),
}));

export const animeCoverImageRelations = relations(animeCoverImage, ({ one }) => ({
  anime: one(anime, {
    fields: [animeCoverImage.animeId],
    references: [anime.id],
  }),
}));

export const studioRelations = relations(studio, ({ many }) => ({
  anime: many(anime),
}));

export const animeRelationRelations = relations(animeRelation, ({ one }) => ({
  anime: one(anime, {
    fields: [animeRelation.animeId],
    references: [anime.id],
    relationName: "anime_to_related",
  }),
  relatedAnime: one(anime, {
    fields: [animeRelation.relatedAnimeId],
    references: [anime.id],
    relationName: "related_to_anime",
  }),
}));

export const episodeRelations = relations(episode, ({ one, many }) => ({
  anime: one(anime, {
    fields: [episode.animeId],
    references: [anime.id],
  }),
  videos: many(episodeVideo),
}));

export const episodeVideoRelations = relations(episodeVideo, ({ one }) => ({
  episode: one(episode, {
    fields: [episodeVideo.episodeId],
    references: [episode.id],
  }),
}));
