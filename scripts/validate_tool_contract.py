#!/usr/bin/env python3
import sys, yaml, jsonschema
schema = {'type':'object','required':['name','version','capabilities']}
doc = yaml.safe_load(open(sys.argv[1],'r',encoding='utf-8'))
jsonschema.validate(doc, schema)
print('Tool contract valid:', sys.argv[1])
