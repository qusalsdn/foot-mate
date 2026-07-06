-- 축구 동호회 플랫폼: 공통 enum 타입 정의
-- 한글 라벨(회장/총무 등)은 프론트에서 매핑, DB는 영문 enum으로 관리

create type member_role as enum
  ('president', 'treasurer', 'manager', 'coach', 'member', 'guest');
  -- 회장 / 총무 / 감독 / 코치 / 회원 / 게스트

create type member_status  as enum ('pending', 'active', 'inactive', 'rejected');
create type match_type     as enum ('internal', 'friendly', 'league');  -- 청백전/친선/리그
create type match_status   as enum ('scheduled', 'closed', 'finished', 'canceled');
create type attend_status  as enum ('attending', 'absent', 'maybe');
create type payment_type   as enum ('monthly_due', 'match_fee', 'other');
create type payment_status as enum ('unpaid', 'paid');
create type post_category  as enum ('notice', 'free', 'gallery');
