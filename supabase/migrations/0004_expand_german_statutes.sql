-- Extend statute detection for German employment-law documents.
update public.legal_documents
set law_code = case
  when filename ~* '(^|[^A-Z])KSchG([^A-Z]|$)' then 'KSchG'
  when filename ~* '(^|[^A-Z])TzBfG([^A-Z]|$)' then 'TzBfG'
  when filename ~* '(^|[^A-Z])ArbZG([^A-Z]|$)' then 'ArbZG'
  when filename ~* '(^|[^A-Z])ArbGG([^A-Z]|$)' then 'ArbGG'
  when filename ~* '(^|[^A-Z])BetrVG([^A-Z]|$)' then 'BetrVG'
  when filename ~* '(^|[^A-Z])AGG([^A-Z]|$)' then 'AGG'
  when filename ~* '(^|[^A-Z])BUrlG([^A-Z]|$)' then 'BUrlG'
  when filename ~* '(^|[^A-Z])EFZG([^A-Z]|$)' then 'EFZG'
  else law_code end
where law_code is null and filename ~* '(KSchG|TzBfG|ArbZG|ArbGG|BetrVG|AGG|BUrlG|EFZG)';

update public.document_chunks dc
set law_code = d.law_code, law_name = coalesce(dc.law_name, d.law_code)
from public.legal_documents d
where d.id = dc.document_id and dc.law_code is null
  and d.law_code in ('KSchG','TzBfG','ArbZG','ArbGG','BetrVG','AGG','BUrlG','EFZG');
