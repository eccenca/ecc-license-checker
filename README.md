ecc-license-checker
===================

This tool enables you to manage the licenses of your npm dependencies easily.
 
It offers three commands: 

  - `ecc-license-checker report` Create a report of currently installed npm production dependencies in yaml format 
  - `ecc-license-checker consolidate` Consolidate an existing curated report with a freshly generated report
  - `ecc-license-checker yaml2json` Convert a yaml report into a json report grouped by license

```
npm install -g ecc-license-checker
ecc-license-checker --help
ecc-license-checker report --help
ecc-license-checker consolidate --help
ecc-license-checker yaml2json --help
```

If you want to update the SPDX license list, run (requires curl and jq):

```
npm run spdx
```
