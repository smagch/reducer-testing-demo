export type FileInterface = {
  name: string;
  stream: () => ReadableStream<Uint8Array>;
  size: number;
};

type Status =
  | "waiting"
  | "validating"
  | "validationFailed"
  | "validationSucceeded"
  | "uploading"
  | "uploadSucceeded"
  | "uploadFailed";

type FileStats = {
  hash: string;
  rowCount: number;
  columns: string[];
};

export type Item = {
  file: FileInterface;
  progress: number;
  status: Status;
  stats?: FileStats;
  err?: string;
};

export type State = {
  items: Item[];
  validating?: FileInterface;
  uploading?: Item[];
};

export type Action =
  | { type: "APPEND_FILES"; files: FileInterface[] }
  | { type: "VALIDATION_SUCCEEDED"; filename: string; stats: FileStats }
  | { type: "VALIDATION_FAILED"; filename: string; err: Error | string }
  | { type: "PROGRESS"; filename: string; progress: number }
  | { type: "UPLOAD_SUCCEEDED"; filename: string }
  | { type: "REMOVE_FILE"; filename: string };

function updateValidateStatus(state: State): State {
  if (!state.items.length) {
    return state;
  }

  let validatingItem = state.items.find((item) => {
    return item.status === "validating";
  });

  if (!validatingItem) {
    const index = state.items.findIndex((item) => {
      return item.status === "waiting";
    });
    if (index !== -1) {
      const current = state.items[index];
      state.items[index] = {
        ...current,
        status: "validating",
      };
      validatingItem = state.items[index];
    }
  }

  if (validatingItem) {
    state.validating = validatingItem.file;
  }

  const uploadingItems = state.items.filter((item) => {
    return item.status === "uploading";
  });
  const validationSucceededItems = state.items.filter((item) => {
    return item.status === "validationSucceeded";
  });
  if (uploadingItems.length < 3 && validationSucceededItems.length) {
    const pickCount = Math.min(
      3 - uploadingItems.length,
      validationSucceededItems.length
    );
    const itemsToUpload = validationSucceededItems.slice(0, pickCount);
    itemsToUpload.forEach((item) => {
      item.status = "uploading";
    });
    uploadingItems.push(...itemsToUpload);
    state.uploading = uploadingItems;
  }

  return state;
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "APPEND_FILES": {
      const items: Item[] = action.files
        .filter((file) => {
          const exists = state.items.some((item) => {
            return item.file.name === file.name;
          });
          return !exists;
        })
        .map((file) => {
          return {
            file,
            status: "waiting",
            progress: 0,
          };
        });

      return updateValidateStatus({
        uploading: state.uploading,
        items: state.items.concat(items),
      });
    }

    case "PROGRESS": {
      const items: Item[] = state.items.map((item) => {
        if (item.file.name !== action.filename) {
          return item;
        }
        return {
          ...item,
          progress: action.progress,
        };
      });

      return {
        ...state,
        items,
      };
    }

    case "VALIDATION_SUCCEEDED": {
      const items: Item[] = state.items.map((item) => {
        if (item.file.name !== action.filename) {
          return item;
        }
        return {
          ...item,
          status: "validationSucceeded",
          progress: 0,
          stats: action.stats,
        };
      });

      return updateValidateStatus({ items, uploading: state.uploading });
    }

    case "VALIDATION_FAILED": {
      const items: Item[] = state.items.map((item) => {
        if (item.file.name !== action.filename) {
          return item;
        }
        return {
          ...item,
          status: "validationFailed",
          err: action.err instanceof Error ? action.err.message : action.err,
          progress: 0,
        };
      });
      return updateValidateStatus({ items, uploading: state.uploading });
    }

    case "UPLOAD_SUCCEEDED": {
      const items: Item[] = state.items.map((item) => {
        if (item.file.name !== action.filename) {
          return item;
        }
        return {
          ...item,
          status: "uploadSucceeded",
          progress: 1,
        };
      });
      const uploading = (state.uploading?.slice() || []).filter((item) => {
        return item.file.name !== action.filename;
      });

      return updateValidateStatus({ items, uploading });
    }

    case "REMOVE_FILE": {
      const items: Item[] = state.items.filter((item) => {
        return item.file.name !== action.filename;
      });
      return updateValidateStatus({ items, uploading: state.uploading });
    }

    default: {
      return state;
    }
  }
};

export function reset(): State {
  return {
    items: [],
  };
}
