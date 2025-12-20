-- Tenant address/contact fields
ALTER TABLE tenants ADD COLUMN legal_name TEXT;
ALTER TABLE tenants ADD COLUMN address_line1 TEXT;
ALTER TABLE tenants ADD COLUMN address_line2 TEXT;
ALTER TABLE tenants ADD COLUMN city TEXT;
ALTER TABLE tenants ADD COLUMN state TEXT;
ALTER TABLE tenants ADD COLUMN postal_code TEXT;
ALTER TABLE tenants ADD COLUMN country TEXT;
ALTER TABLE tenants ADD COLUMN timezone TEXT;
ALTER TABLE tenants ADD COLUMN billing_email TEXT;
ALTER TABLE tenants ADD COLUMN support_email TEXT;
