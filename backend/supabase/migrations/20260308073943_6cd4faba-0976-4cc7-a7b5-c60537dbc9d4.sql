
-- Make the ab_votes insert policy more specific - require non-empty voter_fingerprint
DROP POLICY "Anyone can insert votes" ON public.ab_votes;
CREATE POLICY "Anyone can insert votes with fingerprint" ON public.ab_votes 
  FOR INSERT WITH CHECK (voter_fingerprint IS NOT NULL AND voter_fingerprint != '');
