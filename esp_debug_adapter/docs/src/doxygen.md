## Important!

For initiate that part of the documentation on a local repository, execute in a repo's root directory:

```bash
pushd ./docs/src
doxygen
popd
doxybook -i ./docs/doxygen/xml/ -o ./docs/doxygen/md -t mkdocs
```

Than you could follow to doxygen-generated

[Got it!](../doxygen/md/files.md)