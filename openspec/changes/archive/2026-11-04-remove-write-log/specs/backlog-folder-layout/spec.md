# Spec Delta

## REMOVED Requirements

### Requirement: Project-level files stay at the data directory
**Reason**: It only described the write log, which is removed.
**Migration**: None. `logs` stays a reserved backlog name so a `logs/` folder left by an earlier version never clashes with a backlog.
