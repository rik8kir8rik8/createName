const DifyFlow1Schema = {
  type: "object",
  properties: {
    scene: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pagesNum: {
            type: "number"
          },
          contents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                page: {
                  type: "integer"
                },
                elements: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "introduction",
                      "stimulation", 
                      "problem",
                      "change",
                      "solution",
                      "emotion",
                      "interval"
                    ]
                  }
                },
                characterEmotions: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "joy",
                      "happy",
                      "sad",
                      "painful",
                      "despair",
                      "fun",
                      "anger",
                      "laughter",
                      "tokimeki",
                      "irritation",
                      "surprise",
                      "flat"
                    ]
                  }
                },
                text: {
                  type: "string"
                },
                concept: {
                  type: "string"
                },
                place: {
                  type: "string"
                }
              },
              required: [
                "page",
                "elements",
                "characterEmotions",
                "text",
                "concept",
                "place"
              ],
              additionalProperties: false
            }
          },
          isExcitement: {
            type: "number",
            enum: [0, 1]
          }
        },
        required: [
          "pagesNum",
          "contents",
          "isExcitement"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["scene"],
  additionalProperties: false
};

const DifyFlow2Schema = {
  type: "object",
  properties: {
    panels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "index"
          },
          description: {
            type: "string",
            description: "description"
          },
          type: {
            type: "array",
            enum: [
              "event",
              "situation", 
              "reaction",
              "turning",
              "move"
            ],
            items: {
              type: "string"
            }
          }
        },
        required: [
          "index",
          "description",
          "type"
        ],
        additionalProperties: false
      }
    },
    page: {
      type: "number"
    },
    instructions: {
      type: "string"
    }
  },
  required: [
    "panels",
    "page"
  ],
  additionalProperties: false
};

const DifyElementsEnum = [
  "introduction",
  "stimulation",
  "problem", 
  "change",
  "solution",
  "emotion",
  "interval"
];

const DifyEmotionsEnum = [
  "joy",
  "happy",
  "sad",
  "painful",
  "despair",
  "fun",
  "anger",
  "laughter",
  "tokimeki",
  "irritation",
  "surprise",
  "flat"
];

const DifyPanelTypesEnum = [
  "event",
  "situation",
  "reaction",
  "turning",
  "move"
];

module.exports = {
  DifyFlow1Schema,
  DifyFlow2Schema,
  DifyElementsEnum,
  DifyEmotionsEnum,
  DifyPanelTypesEnum
};