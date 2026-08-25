/*
 * Copyright (c) 2026 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
#ifndef HIVIEW_PLUGINS_RELIABILITY_RESMON_TEST_UTIL_H
#define HIVIEW_PLUGINS_RELIABILITY_RESMON_TEST_UTIL_H

#include <dirent.h>
#include <fcntl.h>
#include <cerrno>
#include <fstream>
#include <string>
#include <sys/stat.h>
#include <unistd.h>
#include <vector>

namespace OHOS {
namespace HiviewDFX {
namespace ResmonTest {
// Filesystem helpers shared by the resource monitor unit tests. Every path is
// scoped under /data/test/resmon, the device test area writable on rk3568.
constexpr int TEST_DIR_MODE = 0750; // owner rwx, group rx

inline bool MakeDir(const std::string &path)
{
    if (mkdir(path.c_str(), TEST_DIR_MODE) == 0) {
        return true;
    }
    return errno == EEXIST;
}

// Creates one prefix directory of `path` (empty prefixes are skipped).
inline void MakeDirPrefix(const std::string &path, size_t end)
{
    std::string part = path.substr(0, end);
    if (!part.empty()) {
        MakeDir(part);
    }
}

// Create every directory prefix of `path` (leaf included), best effort.
inline bool MakeDirs(const std::string &path)
{
    size_t start = (path.size() > 0 && path[0] == '/') ? 1 : 0;
    for (size_t i = start; i <= path.size(); ++i) {
        if (i == path.size() || path[i] == '/') {
            MakeDirPrefix(path, i);
        }
    }
    return true;
}

inline bool WriteFile(const std::string &path, const std::string &content)
{
    std::ofstream ofs(path, std::ios::out | std::ios::trunc);
    if (!ofs.is_open()) {
        return false;
    }
    ofs << content;
    return static_cast<bool>(ofs);
}

inline std::string ReadFile(const std::string &path)
{
    std::ifstream ifs(path);
    if (!ifs.is_open()) {
        return "";
    }
    return std::string((std::istreambuf_iterator<char>(ifs)), std::istreambuf_iterator<char>());
}

// Folds one open directory's entry names into `names`, skipping dot-entries.
inline void ReadDirEntries(DIR *dirp, std::vector<std::string> &names)
{
    struct dirent *ent = nullptr;
    while ((ent = readdir(dirp)) != nullptr) {
        std::string name = ent->d_name;
        if (name != "." && name != "..") {
            names.push_back(name);
        }
    }
}

inline std::vector<std::string> ListFiles(const std::string &dir)
{
    std::vector<std::string> names;
    DIR *dirp = opendir(dir.c_str());
    if (dirp != nullptr) {
        ReadDirEntries(dirp, names);
        closedir(dirp);
    }
    return names;
}

// Shift the file mtime by offsetSec (negative moves it into the past) so the
// rolling-cleanup age dimension is deterministic regardless of write timing.
inline void SetFileMtime(const std::string &path, long offsetSec)
{
    struct stat st = {};
    if (stat(path.c_str(), &st) != 0) {
        return;
    }
    struct timespec times[2] = {};
    times[0].tv_sec = st.st_atim.tv_sec + offsetSec;
    times[1].tv_sec = st.st_mtim.tv_sec + offsetSec;
    utimensat(AT_FDCWD, path.c_str(), times, 0);
}

inline void RemoveDirectory(const std::string &path);

// Removes one child of `path`: recurses into directories, unlinks files.
inline void RemoveChild(const std::string &path, const std::string &name)
{
    std::string child = path + "/" + name;
    struct stat st = {};
    if (stat(child.c_str(), &st) == 0 && S_ISDIR(st.st_mode)) {
        RemoveDirectory(child);
    } else {
        unlink(child.c_str());
    }
}

inline void RemoveDirectory(const std::string &path)
{
    std::vector<std::string> names = ListFiles(path);
    for (const auto &name : names) {
        RemoveChild(path, name);
    }
    rmdir(path.c_str());
}
} // namespace ResmonTest
} // namespace HiviewDFX
} // namespace OHOS
#endif // HIVIEW_PLUGINS_RELIABILITY_RESMON_TEST_UTIL_H
