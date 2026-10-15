# use-core: Licence References

`use-core` is not part of this repository (see [licence_attribution.md](licence_attribution.md#use-core)). This page collects
where its licence information can be read upstream, at the commit that this project pins
(`scripts/install-use-core.sh`).

| What | Where |
|------|-------|
| Upstream repository | [useocl/use](https://github.com/useocl/use) |
| Pinned commit (`30d480d`) | [tree at the pinned commit](https://github.com/useocl/use/tree/30d480dbcca2f404b1350039516a56f46c1efb1f) |
| Licence text of the upstream project | [COPYING](https://github.com/useocl/use/blob/30d480dbcca2f404b1350039516a56f46c1efb1f/COPYING) (GNU General Public License) |
| Licence header of the source files, example | [Session.java](https://github.com/useocl/use/blob/30d480dbcca2f404b1350039516a56f46c1efb1f/use-core/src/main/java/org/tzi/use/main/Session.java) |
| Declared dependencies of `use-core` | [use-core/pom.xml](https://github.com/useocl/use/blob/30d480dbcca2f404b1350039516a56f46c1efb1f/use-core/pom.xml) |

## How USE_NEXT uses it

- `use-core` is used unmodified, as a library built from the pinned upstream commit, under the GPLv3 (project licence:
  [LICENSE](../../LICENSE)).
- The source headers at the pinned commit grant the GNU General Public License "version 2 of the License, or (at your
  option) any later version"; the "or later" option is what allows the use under the GPLv3. The `COPYING` file at that
  commit contains the text of version 2. Not every source file carries the header.
- Changing the pin goes through the maintainer gate (check `use-core-pin`, see [guidelines.md](../guidelines.md)); the
  links above then have to be re-read for the new commit.

## Not covered here

The licences of the libraries that `use-core` itself depends on are listed and marked as not reviewed in
[licence_attribution.md](licence_attribution.md#use-core).
