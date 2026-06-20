CREATE OR REPLACE FUNCTION public.pg_advisory_xact_lock(integer)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock($1::bigint);
  RETURN 1;
END;
$function$;

COMMENT ON FUNCTION public.pg_advisory_xact_lock(integer) IS
'Prisma-safe integer-returning overload for transaction-scoped Bon number allocation.';
