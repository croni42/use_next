# use-core: Licence References

`use-core` is not part of this repository (see [licence_attribution.md](licence_attribution.md#use-core)). This page collects
where its licence information can be read upstream, at the commit that this project pins
(`scripts/install-use-core.sh`).

| What | Where |
|------|-------|
| Upstream repository | [useocl/use](https://github.com/useocl/use) |
| Pinned commit (`b0cb126`) | [tree at the pinned commit](https://github.com/useocl/use/tree/b0cb1261ef5fe1ffb38ff922cfe93a06e8e9828f) |
| Licence text of the upstream project | [COPYING](https://github.com/useocl/use/blob/b0cb1261ef5fe1ffb38ff922cfe93a06e8e9828f/COPYING) (GNU General Public License, version 3) |
| Licence header of the source files, example | [Session.java](https://github.com/useocl/use/blob/b0cb1261ef5fe1ffb38ff922cfe93a06e8e9828f/use-core/src/main/java/org/tzi/use/main/Session.java) |
| Declared dependencies of `use-core` | [use-core/pom.xml](https://github.com/useocl/use/blob/b0cb1261ef5fe1ffb38ff922cfe93a06e8e9828f/use-core/pom.xml) |

## How USE_NEXT uses it

- `use-core` is used unmodified, as a library built from the pinned upstream commit, under the GPLv3 (project licence:
  [LICENSE](../../LICENSE)).
- The source headers at the pinned commit grant the GNU General Public License "either version 3 of the License, or (at
  your option) any later version", and the `COPYING` file at that commit contains the text of version 3, so the use
  under the GPLv3 matches the upstream licence. Not every source file carries the header (547 of the 614 Java files in
  `use-core`, counted on 2026-10-20).
- The pinned commit is the merge of the upstream licence update (useocl/use pull request [#142](https://github.com/useocl/use/pull/142), `license-update`).
- Changing the pin goes through the maintainer gate (check `use-core-pin`, see [guidelines.md](../guidelines.md)); the
  links above then have to be re-read for the new commit.

