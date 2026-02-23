
  create table "public"."NoteVote" (
    "id" text not null,
    "noteId" text not null,
    "userId" text not null,
    "voteType" text not null,
    "createdAt" timestamp without time zone not null default now()
      );


alter table "public"."NoteVote" enable row level security;

CREATE UNIQUE INDEX "NoteVote_noteId_userId_key" ON public."NoteVote" USING btree ("noteId", "userId");

CREATE UNIQUE INDEX "NoteVote_pkey" ON public."NoteVote" USING btree (id);

CREATE INDEX idx_note_votes_note_id ON public."NoteVote" USING btree ("noteId");

CREATE INDEX idx_note_votes_user_id ON public."NoteVote" USING btree ("userId");

alter table "public"."NoteVote" add constraint "NoteVote_pkey" PRIMARY KEY using index "NoteVote_pkey";

alter table "public"."NoteVote" add constraint "NoteVote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES public."Note"(id) ON DELETE CASCADE not valid;

alter table "public"."NoteVote" validate constraint "NoteVote_noteId_fkey";

alter table "public"."NoteVote" add constraint "NoteVote_noteId_userId_key" UNIQUE using index "NoteVote_noteId_userId_key";

alter table "public"."NoteVote" add constraint "NoteVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."NoteVote" validate constraint "NoteVote_userId_fkey";

alter table "public"."NoteVote" add constraint "NoteVote_voteType_check" CHECK (("voteType" = ANY (ARRAY['up'::text, 'down'::text]))) not valid;

alter table "public"."NoteVote" validate constraint "NoteVote_voteType_check";

grant delete on table "public"."NoteVote" to "anon";

grant insert on table "public"."NoteVote" to "anon";

grant references on table "public"."NoteVote" to "anon";

grant select on table "public"."NoteVote" to "anon";

grant trigger on table "public"."NoteVote" to "anon";

grant truncate on table "public"."NoteVote" to "anon";

grant update on table "public"."NoteVote" to "anon";

grant delete on table "public"."NoteVote" to "authenticated";

grant insert on table "public"."NoteVote" to "authenticated";

grant references on table "public"."NoteVote" to "authenticated";

grant select on table "public"."NoteVote" to "authenticated";

grant trigger on table "public"."NoteVote" to "authenticated";

grant truncate on table "public"."NoteVote" to "authenticated";

grant update on table "public"."NoteVote" to "authenticated";

grant delete on table "public"."NoteVote" to "service_role";

grant insert on table "public"."NoteVote" to "service_role";

grant references on table "public"."NoteVote" to "service_role";

grant select on table "public"."NoteVote" to "service_role";

grant trigger on table "public"."NoteVote" to "service_role";

grant truncate on table "public"."NoteVote" to "service_role";

grant update on table "public"."NoteVote" to "service_role";


  create policy "note_votes_delete_own"
  on "public"."NoteVote"
  as permissive
  for delete
  to public
using ((public.current_user_id() = "userId"));



  create policy "note_votes_insert_own"
  on "public"."NoteVote"
  as permissive
  for insert
  to public
with check ((public.current_user_id() = "userId"));



  create policy "note_votes_select_all"
  on "public"."NoteVote"
  as permissive
  for select
  to public
using (true);



  create policy "note_votes_update_own"
  on "public"."NoteVote"
  as permissive
  for update
  to public
using ((public.current_user_id() = "userId"));


CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


