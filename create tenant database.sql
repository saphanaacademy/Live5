hdbsql -n localhost -d SYSTEMDB -i 90 -u system
create database SHA system user password Password1;
alter database SHA add 'diserver';
alter database SHA add 'scriptserver';
grant modeling to XSA_DEV;
call grant_activated_role('sap.hana.xs.ide.roles::Developer','XSA_DEV');
q 
