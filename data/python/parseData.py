import pandas as pd
import csv

df = pd.read_csv("scotch.csv", sep=";")

outputDf = pd.DataFrame(
    columns=["Name", "Color", "Nose", "Body", "Palate", "Finish"])

outputDf['Name'] = df["NAME"]

dfColor = df.iloc[:, 2:16]
print(dfColor.columns)

# Color
dfDictColor = dict(
    list(
        dfColor.groupby(dfColor.index)
    )
)

for k, v in dfDictColor.items():               # k: name of index, v: is a df
    check = v.columns[(v == 1).any()]
    if len(check) > 0:
        outputDf.iloc[k]['Color'] = check.to_list()[0]


# Nose
dfNose = df.iloc[:, 16:28]

print(dfNose.columns)

dfDictNose = dict(
    list(
        dfNose.groupby(dfNose.index)
    )
)
for k, v in dfDictNose.items():               # k: name of index, v: is a df
    check = v.columns[(v == 1).any()]
    if len(check) > 0:
        res = [x.lower() for x in check.to_list()]
        str = "\""
        for i, elem in enumerate(res):
            if i != 0:
                str += ", "
            str += elem
        str += "\""
        outputDf.iloc[k]['Nose'] = str


# Body
dfBody = df.iloc[:, 28:36]

print(dfBody.columns)

dfDictBody = dict(
    list(
        dfBody.groupby(dfBody.index)
    )
)

for k, v in dfDictBody.items():               # k: name of index, v: is a df
    check = v.columns[(v == 1).any()]
    if len(check) > 0:
        str = "\""
        for i, elem in enumerate(check.to_list()):
            if i != 0:
                str += ", "
            str += elem
        str += "\""
        outputDf.iloc[k]['Body'] = str

# Pal
dfPal = df.iloc[:, 36:51]

print(dfPal.columns)

dfDictPal = dict(
    list(
        dfPal.groupby(dfPal.index)
    )
)

for k, v in dfDictPal.items():               # k: name of index, v: is a df
    check = v.columns[(v == 1).any()]
    if len(check) > 0:
        res = check.to_list()
        str = "\""
        for i, item in enumerate(res):
            if i != 0:
                str += ", "
            if item[-1] == "1":
                str += item[: len(item) - 2]
            else:
                str += res[i]
        str += "\""
        outputDf.iloc[k]['Palate'] = str

# Finish
dfFin = df.iloc[:, 51:70]

print(dfFin.columns)

dfDictFin = dict(
    list(
        dfFin.groupby(dfFin.index)
    )
)

for k, v in dfDictFin.items():               # k: name of index, v: is a df
    check = v.columns[(v == 1).any()]
    if len(check) > 0:
        res = check.to_list()
        str = "\""

        for i, item in enumerate(res):
            if i != 0:
                str += ", "
            if item[-1] == "1" or item[-1] == "2":
                str += item[: len(item) - 2]
            else:
                str += res[i]
        str += "\""
        outputDf.iloc[k]['Finish'] = str


outputDf = pd.concat([outputDf, df["%"], df["REGION"], df["DISTRICT"]], axis=1)
outputDf = outputDf.rename(
    columns={"%": "Pourcent", "REGION": "Region", "DISTRICT": "District"})


print(outputDf.head())

outputDf.to_csv("cleanDataSet.csv", sep=";",
                index_label="id", quoting=csv.QUOTE_NONE)
