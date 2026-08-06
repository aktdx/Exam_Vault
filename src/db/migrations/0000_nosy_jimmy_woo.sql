CREATE TABLE "academic_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "academic_year_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"college_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "branch_code_unique" UNIQUE("college_id","code")
);
--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "college_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_paper_id" integer NOT NULL,
	"downloaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exam_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "exam_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "question_papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"exam_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"session" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"uploaded_by_id" integer,
	"pending_deletion" boolean DEFAULT false NOT NULL,
	CONSTRAINT "question_paper_unique" UNIQUE("subject_id","exam_type_id","year","session"),
	CONSTRAINT "question_paper_year_check" CHECK (year >= 2000 AND year <= 2026),
	CONSTRAINT "question_paper_file_size_check" CHECK (file_size > 0)
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"academic_year_id" integer,
	"name" text NOT NULL,
	"number" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "semester_number_unique" UNIQUE("branch_id","number"),
	CONSTRAINT "semester_number_check" CHECK (number > 0)
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subject_code_unique" UNIQUE("branch_id","code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_question_paper_id_question_papers_id_fk" FOREIGN KEY ("question_paper_id") REFERENCES "public"."question_papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_papers" ADD CONSTRAINT "question_papers_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_papers" ADD CONSTRAINT "question_papers_exam_type_id_exam_types_id_fk" FOREIGN KEY ("exam_type_id") REFERENCES "public"."exam_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_papers" ADD CONSTRAINT "question_papers_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subject_idx" ON "question_papers" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "year_idx" ON "question_papers" USING btree ("year");--> statement-breakpoint
CREATE INDEX "session_idx" ON "question_papers" USING btree ("session");--> statement-breakpoint
CREATE INDEX "is_deleted_idx" ON "question_papers" USING btree ("is_deleted");