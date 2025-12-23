data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "managed" {
  count                = var.vpc_id == "" ? 1 : 0
  cidr_block           = var.managed_vpc_cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-vpc-${var.environment}"
    }
  )
}

resource "aws_subnet" "managed" {
  count = var.vpc_id == "" ? min(length(data.aws_availability_zones.available.names), var.managed_subnet_count) : 0

  vpc_id                  = aws_vpc.managed[0].id
  cidr_block              = cidrsubnet(var.managed_vpc_cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index % length(data.aws_availability_zones.available.names)]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-subnet-${count.index + 1}-${var.environment}"
    }
  )
}

resource "aws_internet_gateway" "managed" {
  count  = var.vpc_id == "" ? 1 : 0
  vpc_id = aws_vpc.managed[0].id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-igw-${var.environment}"
    }
  )
}

resource "aws_route_table" "managed" {
  count  = var.vpc_id == "" ? 1 : 0
  vpc_id = aws_vpc.managed[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.managed[0].id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-rt-${var.environment}"
    }
  )
}

resource "aws_route_table_association" "managed" {
  count          = var.vpc_id == "" ? length(aws_subnet.managed) : 0
  subnet_id      = aws_subnet.managed[count.index].id
  route_table_id = aws_route_table.managed[0].id
}

locals {
  selected_vpc_id_final = var.vpc_id != "" ? var.vpc_id : try(aws_vpc.managed[0].id, "")
  selected_subnet_ids   = var.vpc_id != "" ? data.aws_subnets.selected_vpc.ids : aws_subnet.managed[*].id
}

data "aws_subnets" "selected_vpc" {
  depends_on = [aws_subnet.managed]

  filter {
    name   = "vpc-id"
    values = [local.selected_vpc_id_final]
  }
}

resource "aws_security_group" "postgres" {
  name        = "${var.project_name}-postgres-${var.environment}"
  description = "Allow Postgres traffic for the EngageNinja application"
  vpc_id      = local.selected_vpc_id_final

  ingress {
    description = "Allow Postgres access from anywhere (development)"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-postgres"
    }
  )
}

resource "random_password" "db" {
  count   = var.db_master_password == "" ? 1 : 0
  length  = 24
  special = true
}

locals {
  generated_db_password = length(random_password.db) > 0 ? random_password.db[0].result : ""
  db_password           = var.db_master_password != "" ? var.db_master_password : local.generated_db_password
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-${var.environment}"
  subnet_ids = local.selected_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-db-subnet-group"
    }
  )
}

resource "aws_db_instance" "postgres" {
  identifier                 = "${var.project_name}-pg-${var.environment}"
  engine                     = "postgres"
  engine_version             = var.db_engine_version
  instance_class             = var.db_instance_class
  allocated_storage          = var.db_allocated_storage
  max_allocated_storage      = var.db_max_allocated_storage
  storage_type               = "gp3"
  username                   = var.db_username
  password                   = local.db_password
  db_name                    = var.db_name
  port                       = var.db_port
  publicly_accessible        = true
  skip_final_snapshot        = true
  deletion_protection        = false
  backup_retention_period    = var.db_backup_retention_days
  auto_minor_version_upgrade = true
  db_subnet_group_name       = aws_db_subnet_group.main.name
  vpc_security_group_ids     = [aws_security_group.postgres.id]

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-postgres"
      Service = "RDS"
    }
  )
}

output "postgres_endpoint" {
  description = "Postgres endpoint to connect from Lambdas/Backend"
  value       = aws_db_instance.postgres.endpoint
}

output "postgres_port" {
  description = "Postgres port"
  value       = aws_db_instance.postgres.port
}

output "postgres_database_url" {
  description = "Postgres connection string"
  value       = "postgresql://${var.db_username}:${local.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}"
  sensitive   = true
}

output "postgres_master_password" {
  description = "Sensitive Postgres master password"
  value       = local.db_password
  sensitive   = true
}
