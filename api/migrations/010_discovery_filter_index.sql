CREATE INDEX IF NOT EXISTS profiles_discovery_filter_idx
  ON profiles (discoverable, age, gender)
  WHERE discoverable = true;
