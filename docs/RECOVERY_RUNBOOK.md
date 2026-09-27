# Database Recovery Runbook

This runbook outlines the procedures for restoring the Hunty database in various failure scenarios, as well as the configuration for automated backups.

## Backup Architecture

- **Method**: Logical backups using `pg_dump` via a scheduled cron job.
- **Frequency**: Automated hourly backups to satisfy the 1-hour Recovery Point Objective (RPO).
- **Off-site Storage**: Backups are securely transferred to an off-site S3 bucket (`s3://hunty-database-backups`).
- **Verification**: Each backup is automatically restored to a temporary verification database (`hunty_dev_verify`) to ensure data integrity and completeness before being finalized.

## RTO and RPO

- **RPO (Recovery Point Objective)**: 1 Hour (maximum data loss).
- **RTO (Recovery Time Objective)**: < 15 minutes (time to restore the database from a backup).

---

## Scenario 1: Accidental Data Deletion or Corruption

If data was accidentally deleted, altered, or corrupted within the last hour, you can restore from the most recent local or off-site backup.

### Step 1: Identify the Latest Backup

Locate the latest backup file in the local backup directory:

```bash
ls -l ./data/backups/
```

If the local backup is unavailable or compromised, download the latest backup from S3:

```bash
aws s3 ls s3://hunty-database-backups/
aws s3 cp s3://hunty-database-backups/db_backup_<TIMESTAMP>.sql.gz ./data/backups/
```

### Step 2: Execute the Restore Script

Use the provided restore script to overwrite the current database with the backup.

```bash
./scripts/db-restore.sh ./data/backups/db_backup_<TIMESTAMP>.sql.gz
```

*Note: The script will prompt for confirmation before terminating existing connections and restoring the data.*

---

## Scenario 2: Complete Infrastructure Failure

In the event of a catastrophic failure where the server or Docker host is lost, follow these steps to provision a new environment and restore the data.

### Step 1: Provision the Environment

Clone the repository and start the Docker environment on the new host:

```bash
git clone https://github.com/ayaoba24/hunty.git
cd hunty
docker-compose up -d db
```

Wait for the database container to initialize.

### Step 2: Retrieve the Backup from Off-site Storage

Download the latest backup from the S3 bucket:

```bash
mkdir -p ./data/backups
aws s3 cp s3://hunty-database-backups/db_backup_<TIMESTAMP>.sql.gz ./data/backups/
```

### Step 3: Perform the Restore

Execute the restore script against the newly provisioned database:

```bash
./scripts/db-restore.sh ./data/backups/db_backup_<TIMESTAMP>.sql.gz
```

### Step 4: Verify Application State

Start the rest of the application stack and verify that the data is intact and accessible:

```bash
docker-compose up -d
```

---

## Backup Configuration (Cron)

To satisfy the 1-hour RPO, configure a cron job on the host machine to run the backup script hourly.

Open the crontab editor:

```bash
crontab -e
```

Add the following entry (adjusting the path to the repository):

```cron
# Run database backup every hour at minute 0
0 * * * * /path/to/hunty/scripts/db-backup.sh >> /var/log/hunty_db_backup.log 2>&1
```

## Point-in-Time Recovery (PITR) Capability

While logical backups (pg_dump) provide a solid baseline, true Point-in-Time Recovery requires Write-Ahead Log (WAL) archiving. 
If sub-hour precision is required, you can enable continuous WAL archiving by adjusting the `db` service command in `docker-compose.yml`:

```yaml
    command: ["postgres", "-c", "wal_level=replica", "-c", "archive_mode=on", "-c", "archive_command=cp %p /var/lib/postgresql/data/archive/%f"]
```

*Currently, the hourly snapshot architecture with automated verification is utilized to meet the 1-hour RPO.*
