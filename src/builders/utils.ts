export const generateValibotGroupByArgsGenericType = (): string => {
  return `export type ValibotGroupByArgs<
    // GArgs: base shape of the groupBy input
    // (e.g. v.InferInput<typeof UserGroupByArgsSchema>)
    GArgs extends {
      by: unknown;
      orderBy?: unknown;
      having?: unknown;
      take?: number;
      skip?: number;
    },
    // T: actual args that will be used (defaults to GArgs)
    T extends GArgs = GArgs,
    // Whether args contain skip or take
    HasSelectOrTake = Prisma.Or<
      Prisma.Extends<'skip', Prisma.Keys<T>>,
      Prisma.Extends<'take', Prisma.Keys<T>>
    >,
    // If skip/take is present, orderBy is required; otherwise it is optional
    OrderByArg = Prisma.True extends HasSelectOrTake
      ? { orderBy: GArgs['orderBy'] }
      : { orderBy?: GArgs['orderBy'] },
    // ----- ORDER BY FIELDS -----
  
    // Keys(...) -> string | number | symbol
    OrderByFieldCandidates extends string = Extract<
      Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>,
      string
    >,
    // ExcludeUnderscoreKeys requires string and returns string
    // but we constrain to keyof any so it can be used as a mapped type key
    OrderFields extends keyof any = Prisma.ExcludeUnderscoreKeys<OrderByFieldCandidates>,
    // ----- BY / HAVING FIELDS -----
  
    ByFields = Prisma.MaybeTupleToUnion<T['by']>,
    ByValid = Prisma.Has<ByFields, OrderFields>,
    HavingFieldCandidates = Prisma.GetHavingFields<T['having']>,
    // Filter to valid keys (string | number | symbol)
    HavingFields extends keyof any = Extract<HavingFieldCandidates, keyof any>,
    HavingValid = Prisma.Has<ByFields, HavingFields>,
    ByEmpty = T['by'] extends never[] ? Prisma.True : Prisma.False,
    // ----- INPUT ERRORS -----
  
    InputErrors = ByEmpty extends Prisma.True // "by" must not be empty
      ? ['Error', '"by" must not be empty.']
      : // every field used in "having" must be present in "by"
        HavingValid extends Prisma.False
        ? {
            [P in HavingFields]: P extends ByFields
              ? never
              : ['Error', 'Field', P, 'used in "having" needs to be provided in "by".'];
          }[HavingFields]
        : // if "take" is provided, "orderBy" must be provided
          'take' extends Prisma.Keys<T>
          ? 'orderBy' extends Prisma.Keys<T>
            ? ByValid extends Prisma.True
              ? unknown
              : {
                  [P in OrderFields]: P extends ByFields
                    ? never
                    : ['Error', 'Field', P, 'in "orderBy" needs to be provided in "by".'];
                }[OrderFields]
            : ['Error', 'If you provide "take", you also need to provide "orderBy"']
          : // if "skip" is provided, "orderBy" must be provided
            'skip' extends Prisma.Keys<T>
            ? 'orderBy' extends Prisma.Keys<T>
              ? ByValid extends Prisma.True
                ? unknown
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : ['Error', 'Field', P, 'in "orderBy" needs to be provided in "by".'];
                  }[OrderFields]
              : ['Error', 'If you provide "skip", you also need to provide "orderBy"']
            : // otherwise: orderBy fields must all be present in by
              ByValid extends Prisma.True
              ? unknown
              : {
                  [P in OrderFields]: P extends ByFields
                    ? never
                    : ['Error', 'Field', P, 'in "orderBy" needs to be provided in "by".'];
                }[OrderFields],
  > = T & OrderByArg & InputErrors;
`;
};
