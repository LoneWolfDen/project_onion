# PII AWS Architecture v0.19
Comprehend DetectPiiEntities Email Amount -> [EMAIL_REDACTED] [AMOUNT_REDACTED]
Macie S3 scanning sensitive
KMS per client Acme NovaTech Stellar Private user key Team Shared client key
S3 private/{user_id}/{project_id}/ only user team-shared/{client_id}/{project_id}/ all users client
Lambda project-onion-pii-redact PutObject private -> Comprehend -> redacted team-shared if Team Shared
DynamoDB ProjectOnionAudit PK PRJ- SK timestamp action Archive/Enable/Merge/PII Approve justification user timestamp original vs redacted privacy TTL 7y
IAM Roles User read private own + team-shared client Approver approve PII redacted share Admin Enable archived
Flow Original note -> Comprehend -> redaction preview + Copilot rephrase -> Review Original vs Rephrased + radio Private/Team Shared -> Approve to save changes -> audit DynamoDB -> if Team Shared Lambda S3 team-shared encrypted client KMS searchable Both Union
