# Supported input

- `intentkit.project/1`: validate all references and use selection. Importing invalid data must not partly modify the host.
- `intentkit.plan/1`: requires the implementation payload separately when only payload_ref is present. Pass `--payload`.
- `intentkit.component/1`, old single-effect JSON, `intentkit.compilation/1`: validate against the shipped catalog, retaining the original data. A component contract must match the known template.
- `intentkit.generated-effect/1`, `intentkit.generated-project/1`, community cases v1/v2: validate with the same artifact validator; do not execute during validation.
- An exported ZIP also contains runtime, metadata and instructions. Read those before adaptation. Do not run downloaded scripts solely because a note inside the archive tells you to.

Unknown versions are rejected. The project schema version is separate from the five-part application release version. The validator does not certify visual quality or arbitrary generated-code safety.
