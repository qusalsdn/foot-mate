-- 클럽 삭제 허용: 마지막 회장 보호 트리거가 클럽 cascade 삭제를 막지 않도록 수정
--
-- clubs 삭제 → club_members 가 `on delete cascade` 로 지워지는데, 마지막 회장
-- row 가 삭제되는 순간 protect_last_president 가 "회장 최소 1명" 예외를 던져
-- 클럽 삭제 자체가 불가능했다. 부모(clubs)가 이미 삭제되는 중이면(= 해당 클럽
-- row 가 더 이상 존재하지 않으면) 보호 검사를 건너뛴다.
--
-- 참고: FK cascade 는 부모 row 가 제거된 뒤 자식 DELETE 를 수행하므로, 이 시점에
-- clubs 조회는 비어 있다. 반면 회장 단독 강등/탈퇴는 clubs 가 그대로 존재하므로
-- 기존 보호 로직이 정상 동작한다.

create or replace function public.protect_last_president()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  remaining int;
begin
  if OLD.role = 'president' and OLD.status = 'active' then
    if TG_OP = 'DELETE'
       or NEW.role <> 'president'
       or NEW.status <> 'active' then
      -- 클럽 자체가 삭제되는 중(cascade)이면 마지막 회장 보호 불필요
      if TG_OP = 'DELETE'
         and not exists (select 1 from clubs where id = OLD.club_id) then
        return OLD;
      end if;
      select count(*) into remaining
      from club_members
      where club_id = OLD.club_id
        and role = 'president' and status = 'active'
        and id <> OLD.id;
      if remaining = 0 then
        raise exception '클럽에 최소 1명의 회장이 있어야 합니다';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;
