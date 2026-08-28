begin;

alter type public.billing_plan_code add value if not exists 'elite';

commit;
