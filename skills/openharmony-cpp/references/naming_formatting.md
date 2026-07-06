# Naming & Formatting Conventions

## File Naming
*   **Rule:** `.cpp` and `.h` extensions only.
*   **Rule:** Filenames **must** match the class name (Unix-like style).
    *   *Example:* Class `DatabaseConnection` -> `database_connection.h`, `database_connection.cpp`

## Naming Styles
*   **Classes/Structs/Enums:** `UpperCamelCase`
*   **Functions:** `UpperCamelCase`
*   **Variables (local/member):** `lowerCamelCase`
*   **Global Variables:** `g_lowerCamelCase` (prefix with `g_`)
*   **Member Variables:** `lowerCamelCase` with trailing underscore (e.g., `fileName_`).
*   **Macros/Constants:** `ALL_CAPS_WITH_UNDERSCORES`

## Formatting
*   **Line Length:** Max 120 characters.
*   **Indentation:** 4 spaces (no tabs).
*   **Braces:** **Allman style for function definitions** (opening brace on its own next line); **K&R style for everything else** (control statements, `class`/`struct`, `namespace`, etc. keep the opening brace on the same line).
    *   *Critical:* Function definitions put the opening brace on the **next** line; `if`/`else`/`for`/`while`/`switch`/`class`/`struct`/`namespace` keep it on the **same** line.
*   **Switch:** Indent `case` and `default` by 4 spaces.
