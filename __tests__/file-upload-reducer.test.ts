import { reducer, reset, State, FileInterface } from "../file-upload-reducer";

const file = (filename: string): FileInterface => {
  const encoder = new TextEncoder();
  const chunk = encoder.encode(filename);
  return {
    name: filename,
    size: chunk.byteLength,
    stream: (): ReadableStream<Uint8Array> => {
      return new ReadableStream<Uint8Array>({
        pull(controller: ReadableStreamDefaultController<Uint8Array>) {
          controller.enqueue(chunk);
          controller.close();
        },
      }) as ReadableStream<Uint8Array>;
    },
  };
};

function getState(): State {
  return {
    items: [
      {
        file: file("file1.txt"),
        progress: 0.1,
        status: "validating" as const,
      },
      {
        file: file("file2.txt"),
        progress: 0,
        status: "waiting" as const,
      },
      {
        file: file("file3.txt"),
        progress: 0,
        status: "waiting" as const,
      },
      {
        file: file("file4.txt"),
        progress: 0,
        status: "waiting" as const,
      },
    ],
  };
}

test("empty state", () => {
  expect(reset()).toMatchSnapshot();
});

test("APPEND_FILES dispatch", () => {
  let state = reducer(reset(), {
    type: "APPEND_FILES",
    files: [file("file1.txt")],
  });

  expect(state).toMatchSnapshot();

  state = reducer(state, {
    type: "APPEND_FILES",
    files: [file("file2.txt"), file("file3.txt")],
  });

  expect(state).toMatchSnapshot();
});

test("VALIDATION_SUCCEEDED", () => {
  let state = getState();
  for (const filename of ["file1.txt", "file2.txt", "file3.txt", "file4.txt"]) {
    state = reducer(state, {
      type: "VALIDATION_SUCCEEDED",
      filename,
      stats: {
        hash: "hash",
        rowCount: 1000,
        columns: ["id", "name", "email"],
      },
    });
    expect(state).toMatchSnapshot();
  }
});

test("VALIDATION_FAILED", () => {
  let state = getState();
  state = reducer(state, {
    type: "VALIDATION_FAILED",
    filename: "file1.txt",
    err: "invalid encoding",
  });
  expect(state).toMatchSnapshot();

  state = reducer(state, {
    type: "VALIDATION_FAILED",
    filename: "file2.txt",
    err: "invalid csv format",
  });
  expect(state).toMatchSnapshot();
});

test("PROGRESS", () => {
  let state: State = {
    items: [
      {
        file: file("file1.txt"),
        progress: 0,
        status: "uploading" as const,
      },
      {
        file: file("file2.txt"),
        progress: 0,
        status: "uploading" as const,
      },
    ],
  };

  state = reducer(state, {
    type: "PROGRESS",
    progress: 0.2,
    filename: "file1.txt",
  });

  expect(state).toMatchSnapshot();
});

test("UPLOAD_SUCCEEDED", () => {
  const items = [
    {
      file: file("file1.txt"),
      progress: 0,
      status: "uploading" as const,
    },
    {
      file: file("file2.txt"),
      progress: 0,
      status: "uploading" as const,
    },
    {
      file: file("file3.txt"),
      progress: 0,
      status: "uploading" as const,
    },
    {
      file: file("file4.txt"),
      progress: 0,
      status: "validationSucceeded" as const,
    },
  ];

  let state: State = {
    items,
    uploading: [items[0], items[1], items[2]],
  };

  state = reducer(state, {
    type: "UPLOAD_SUCCEEDED",
    filename: "file1.txt",
  });

  expect(state).toMatchSnapshot();
});

test("REMOVE FILE", () => {
  let state = getState();
  state = reducer(state, {
    type: "REMOVE_FILE",
    filename: "file2.txt",
  });
  expect(state).toMatchSnapshot();

  state = reducer(state, {
    type: "REMOVE_FILE",
    filename: "file1.txt",
  });
  expect(state).toMatchSnapshot();
});
