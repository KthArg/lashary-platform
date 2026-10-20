CREATE TABLE public.clients_precaution_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 60),
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_clients_precaution_categories_name ON public.clients_precaution_categories (lower(name));
CREATE INDEX idx_clients_precaution_categories_created_by ON public.clients_precaution_categories (created_by);

INSERT INTO public.clients_precaution_categories (name)
VALUES ('Alergia'), ('Sensibilidad'), ('Condición relevante');

ALTER TABLE public.clients_precaution_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_precaution_categories_select_admin"
  ON public.clients_precaution_categories
  FOR SELECT
  TO authenticated
  USING ((SELECT public.auth_is_admin()));

CREATE POLICY "clients_precaution_categories_insert_admin"
  ON public.clients_precaution_categories
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.auth_is_admin()) AND created_by = (SELECT auth.uid()));

CREATE FUNCTION public.clients_record_precautions_are_valid(precautions jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(precautions) <> 'array' THEN false ELSE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(precautions) AS item
    WHERE jsonb_typeof(item) <> 'object'
       OR jsonb_typeof(item -> 'id') IS DISTINCT FROM 'string'
       OR jsonb_typeof(item -> 'categoryId') IS DISTINCT FROM 'string'
       OR jsonb_typeof(item -> 'categoryName') IS DISTINCT FROM 'string'
       OR jsonb_typeof(item -> 'description') IS DISTINCT FROM 'string'
  ) END
$$;

CREATE FUNCTION public.clients_record_images_belong_to(images jsonb, client_id uuid) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(images) <> 'array' THEN false ELSE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(images) AS item
    WHERE jsonb_typeof(item) IS DISTINCT FROM 'string'
       OR NOT starts_with(item #>> '{}', client_id::text || '/')
  ) END
$$;

GRANT EXECUTE ON FUNCTION public.clients_record_precautions_are_valid(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clients_record_images_belong_to(jsonb, uuid) TO authenticated;

CREATE TABLE public.clients_record_versions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                   uuid NOT NULL REFERENCES public.clients_profiles(id) ON DELETE RESTRICT,
  previous_version_id         uuid UNIQUE,
  change_kind                 text NOT NULL CHECK (change_kind IN (
                                'initial',
                                'precaution_added',
                                'precaution_removed',
                                'study_edited',
                                'image_added'
                              )),
  study_text                  text NOT NULL CHECK (length(btrim(study_text)) BETWEEN 1 AND 4000),
  recommended_technique_id    uuid,
  recommended_technique_name  text CHECK (length(btrim(recommended_technique_name)) BETWEEN 1 AND 120),
  precautions                 jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
                                jsonb_typeof(precautions) = 'array'
                                AND jsonb_array_length(precautions) <= 50
                              ),
  images                      jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
                                jsonb_typeof(images) = 'array'
                                AND jsonb_array_length(images) <= 20
                              ),
  created_by                  uuid NOT NULL REFERENCES auth.users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clients_record_versions_id_client_unique UNIQUE (id, client_id),
  CONSTRAINT clients_record_versions_previous_same_client
    FOREIGN KEY (previous_version_id, client_id)
    REFERENCES public.clients_record_versions (id, client_id)
    ON DELETE RESTRICT,
  CONSTRAINT clients_record_versions_initial_has_no_previous
    CHECK ((change_kind = 'initial') = (previous_version_id IS NULL)),
  CONSTRAINT clients_record_versions_technique_id_and_name_together
    CHECK ((recommended_technique_id IS NULL) = (recommended_technique_name IS NULL)),
  CONSTRAINT clients_record_versions_precautions_shape
    CHECK (public.clients_record_precautions_are_valid(precautions)),
  CONSTRAINT clients_record_versions_images_belong_to_client
    CHECK (public.clients_record_images_belong_to(images, client_id))
);

CREATE UNIQUE INDEX idx_clients_record_versions_one_initial_per_client ON public.clients_record_versions (client_id) WHERE previous_version_id IS NULL;
CREATE INDEX idx_clients_record_versions_client_created_at ON public.clients_record_versions (client_id, created_at DESC);
CREATE INDEX idx_clients_record_versions_created_by ON public.clients_record_versions (created_by);

ALTER TABLE public.clients_record_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_record_versions_select_admin"
  ON public.clients_record_versions
  FOR SELECT
  TO authenticated
  USING ((SELECT public.auth_is_admin()));

CREATE POLICY "clients_record_versions_insert_admin"
  ON public.clients_record_versions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.auth_is_admin()) AND created_by = (SELECT auth.uid()));
