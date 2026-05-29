
create or replace function public.shipment_charges_set_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.actual_charge is null then
    new.status := 'pending';
  else
    if abs(coalesce(new.variance, 0)) <= greatest(2, new.expected_charge * 0.02) then
      new.status := 'matched';
    elsif new.variance > 0 then
      new.status := 'overcharge';
    else
      new.status := 'undercharge';
    end if;
    if new.reconciled_at is null then
      new.reconciled_at := now();
    end if;
  end if;
  return new;
end;
$$;
