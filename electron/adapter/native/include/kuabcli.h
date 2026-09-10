#ifndef _KUABCLI_H
#define _KUABCLI_H

#include <time.h>

#ifdef WIN32
    #ifdef KCBPCLI_EXPORTS
        #define KUABCLI_API __declspec(dllexport)
    #else
        #define KUABCLI_API __declspec(dllimport)
    #endif
    
    #define KUABCLISTDCALL __stdcall   /* ensure stcall calling convention on NT */
#else
    #define KUABCLI_API
    #define KUABCLISTDCALL				/* leave blank for other systems */
#endif


/* Transact option values  */
#define KUAB_COMMIT					9
#define KUAB_ROLLBACK				10

#define UNKNOWN_ROWS				0xffffffff

#define KUAB_SERVERNAME_MAX			32
#define KUAB_DESCRIPTION_MAX		32

#define KUAB_MSGID_LEN				32
#define KUAB_CORRID_LEN				32
#define KUAB_USERID_LEN				12
#define KUAB_SERIAL_LEN				26

#define KUAB_PSFLAG_PERSISTENT		0x00000001
#define KUAB_PSFLAG_NOPERSISTENT	0x00000002
#define KUAB_PSFLAG_REDELIVERED		0x00000004
#define KUAB_PSFLAG_NOREDELIVERED	0x00000008
#define KUAB_PSFLAG_SYSTEM			0x00000010
#define KUAB_PSFLAG_USER			0x00000020

#define KUAB_OPTION_CONNECT			0
#define KUAB_OPTION_TIMEOUT			1
#define KUAB_OPTION_TRACE			2
#define KUAB_OPTION_CRYPT			3
#define KUAB_OPTION_COMPRESS		4
#define KUAB_OPTION_PARITY			5
#define KUAB_OPTION_SEQUENCE		6
#define KUAB_OPTION_CURRENT_CONNECT 7
#define KUAB_OPTION_CONNECT_HANDLE	8
#define KUAB_OPTION_CONFIRM			9
#define KUAB_OPTION_NULL_PASS		10
#define KUAB_OPTION_TIME_COST		11
#define KUAB_OPTION_CONNECT_EX		12
#define KUAB_OPTION_CURRENT_CONNECT_EX 13
#define KUAB_OPTION_AUTHENTICATION	14
#define KUAB_OPTION_GROUPID			15
#define KUAB_OPTION_USE_GROUPID		16
#define KUAB_OPTION_RECEIVE_PACKET_BY_GROUP 17

#define KUAB_PARAM_NODE				0
#define KUAB_PARAM_CLIENT_MAC		1
#define KUAB_PARAM_CONNECTION_ID	2
#define KUAB_PARAM_SERIAL			3
#define KUAB_PARAM_USERNAME			4
#define KUAB_PARAM_PACKETTYPE		5
#define KUAB_PARAM_PACKAGETYPE		KUAB_PARAM_PACKETTYPE
#define KUAB_PARAM_SERVICENAME		6
#define KUAB_PARAM_RESERVED			7
#define KUAB_PARAM_DESTNODE			8

#define KUAB_FETCH_NEXT			1
#define KUAB_FETCH_FIRST		2
#define KUAB_FETCH_LAST			3
#define KUAB_FETCH_PRIOR		4
#define KUAB_FETCH_ABSOLUTE		5
#define KUAB_FETCH_RELATIVE		6

#if (defined(KUAB_AIX) && defined(__xlC__))
#pragma options align = packed
#else
#pragma pack(1)
#endif
typedef struct
{
	char szServerName[KUAB_SERVERNAME_MAX + 1];
	int nProtocal;
	char szAddress[KUAB_DESCRIPTION_MAX + 1];
	int nPort;
	char szSendQName[KUAB_DESCRIPTION_MAX + 1];
	char szReceiveQName[KUAB_DESCRIPTION_MAX + 1];
	char szReserved[KUAB_DESCRIPTION_MAX + 1];
}
tagKUABConnectOption;

#define KUAB_PROXY_MAX				128
#define KUAB_SSL_MAX				256
typedef struct
{
	char szServerName[KUAB_SERVERNAME_MAX + 1];
	int nProtocal;
	char szAddress[KUAB_DESCRIPTION_MAX + 1];
	int nPort;
	char szSendQName[KUAB_DESCRIPTION_MAX + 1];
	char szReceiveQName[KUAB_DESCRIPTION_MAX + 1];
	char szReserved[KUAB_DESCRIPTION_MAX + 1];
	char szProxy[KUAB_PROXY_MAX + 1];
	char szSSL[KUAB_SSL_MAX + 1];
}
tagKUABConnectOptionEx;

/* callback notification function definition. */
typedef void (KUABCLI_Callback_t) (void *);
typedef KUABCLI_Callback_t *KUABCLI_Notify_t;

/* control parameters to publish/subscribe queue primitives */
typedef struct
{
	int nFlags;						/* indicates which of the values are set , inlcude type, mode, redelivered flag*/
	char szId[KUAB_SERIAL_LEN + 1]; /* pub/sub serial identifer */
	char szMsgId[KUAB_MSGID_LEN + 1];	/* id of message before which to queue */
	char szCorrId[KUAB_CORRID_LEN + 1]; /* correlation id used to identify message */
	int nExpiry;						/* subscribe message duration time, unit with second */
	int nPriority;						/* publish priority */
	time_t tTimeStamp;					/* pub/sub timestamp*/
	KUABCLI_Notify_t lpfnCallback;		/* callback function pointer*/
} tagCallCtrl;

typedef tagCallCtrl tagKUABPSControl;

#if (defined(KUAB_AIX) && defined(__xlC__))
#pragma options align = reset
#elif defined(KUAB_SOL)
#pragma pack(4)
#else
#pragma pack()
#endif
typedef void *KUABCLIHANDLE;

#ifdef __cplusplus
extern "C"
{
#endif

	KUABCLI_API int KUABCLISTDCALL KUABCLI_Init(KUABCLIHANDLE *hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_Exit(KUABCLIHANDLE hHandle);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetVersion(KUABCLIHANDLE hHandle, int *pnVersion);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_SetConnectOption(KUABCLIHANDLE hHandle, tagKUABConnectOption stKUABConnection);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetConnectOption(KUABCLIHANDLE hHandle, tagKUABConnectOption *pstKUABConnection);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_ConnectServer(KUABCLIHANDLE hHandle, char *ServerName, char *UserName, char *Password);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_DisConnect(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_DisConnectForce(KUABCLIHANDLE hHandle);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_BeginWrite(KUABCLIHANDLE hHandle);

	/*synchronize call*/
	KUABCLI_API int KUABCLISTDCALL KUABCLI_CallProgramAndCommit(KUABCLIHANDLE hHandle, char *ProgramName);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_CallProgram(KUABCLIHANDLE hHandle, char *ProgramName);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_Commit(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RollBack(KUABCLIHANDLE hHandle);

	/*asynchronize call*/
	KUABCLI_API int KUABCLISTDCALL KUABCLI_ACallProgramAndCommit(KUABCLIHANDLE hHandle, char *ProgramName, tagCallCtrl *ptagCallCtrl);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_ACallProgram(KUABCLIHANDLE hHandle, char *ProgramName, tagCallCtrl *ptagCallCtrl);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetReply(KUABCLIHANDLE hHandle, tagCallCtrl *ptagCallCtrl);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_Cancel(KUABCLIHANDLE hHandle, tagCallCtrl *ptagCallCtrl);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetValue(KUABCLIHANDLE hHandle, char *KeyName, char *Vlu, int Len);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SetValue(KUABCLIHANDLE hHandle, char *KeyName, char *Vlu);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetVal(KUABCLIHANDLE hHandle, char *szKeyName, unsigned char **pValue, long *pSize);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SetVal(KUABCLIHANDLE hHandle, char *szKeyName, unsigned char *pValue, long nSize);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_Convert(KUABCLIHANDLE hHandle, char *szType, int nSrcByteOrder, unsigned char *pSrcBuf, long nSrcBufSize, int nDstByteOrder, unsigned char *pDstBuf, long nDstBufSize, int nFlag);

	/*rs*/
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsCreate(KUABCLIHANDLE hHandle, char *Name, int ColNum, char *pColInfo);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsNewTable(KUABCLIHANDLE hHandle, char *Name, int ColNum, char *pColInfo);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsAddRow(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsSaveRow(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsSetCol(KUABCLIHANDLE hHandle, int Col, char *Vlu);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsSetColByName(KUABCLIHANDLE hHandle, char *Name, char *Vlu);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsSetVal(KUABCLIHANDLE hHandle, int nColumnIndex, unsigned char *pValue, long nSize);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsSetValByName(KUABCLIHANDLE hHandle, char *szColumnName, unsigned char *pValue, long nSize);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsOpen(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsMore(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsClose(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetCursorName(KUABCLIHANDLE hHandle, char *pszCursorName, int nLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetColNames(KUABCLIHANDLE hHandle, char *pszInfo, int nLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetColName(KUABCLIHANDLE hHandle, int nCol, char *pszName, int nLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsFetchRow(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsFetchRowScroll(KUABCLIHANDLE hHandle, int nOrientation, int nOffset);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetCol(KUABCLIHANDLE hHandle, int Col, char *Vlu);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetColByName(KUABCLIHANDLE hHandle, char *KeyName, char *Vlu);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetVal(KUABCLIHANDLE hHandle, int nColumnIndex, unsigned char **pValue, long *pSize);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetValByName(KUABCLIHANDLE hHandle, char *szColumnName, unsigned char **pValue, long *pSize);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetRowNum(KUABCLIHANDLE hHandle, int *pnRows);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetColNum(KUABCLIHANDLE hHandle, int *pnCols);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetTableRowNum(KUABCLIHANDLE hHandle, int nt, int *pnRows);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_RsGetTableColNum(KUABCLIHANDLE hHandle, int nt, int *pnCols);

	/*misc*/
	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetErr(KUABCLIHANDLE hHandle, int *pErrCode, char *ErrMsg);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetErrorCode(KUABCLIHANDLE hHandle, int *pnErrno);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetErrorMsg(KUABCLIHANDLE hHandle, char *szError);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetCommLen(KUABCLIHANDLE hHandle, int *pnLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SetCliTimeOut(KUABCLIHANDLE hHandle, int TimeOut);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SetOption(KUABCLIHANDLE hHandle, int nIndex, void *pValue);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetOption(KUABCLIHANDLE hHandle, int nIndex, void *pValue);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SetOptions(KUABCLIHANDLE hHandle, int nIndex, void *pValue, int nLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetOptions(KUABCLIHANDLE hHandle, int nIndex, void *pValue, int *nLen);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_SetSystemParam(KUABCLIHANDLE hHandle, int nIndex, char *szValue);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_GetSystemParam(KUABCLIHANDLE hHandle, int nIndex, char *szValue, int nLen);

	/*SQL-Liked*/
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLConnect(KUABCLIHANDLE hHandle, char *ServerName, char *UserName, char *Password);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLDisconnect(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLExecute(KUABCLIHANDLE hHandle, char *szProgramName);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLNumResultCols(KUABCLIHANDLE hHandle, int *pnresultcols);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLGetCursorName(KUABCLIHANDLE hHandle, char *pszCursorName, int nLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLGetColNames(KUABCLIHANDLE hHandle, char *szTableInfo, int nLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLGetColName(KUABCLIHANDLE hHandle, int nCol, char *szTableInfo, int nLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLFetch(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLFetchScroll(KUABCLIHANDLE hHandle, int nOrientation, int nOffset);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLMoreResults(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLCloseCursor(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SQLEndTran(KUABCLIHANDLE hHandle, int nType);

	/*pub/sub*/
	KUABCLI_API int KUABCLISTDCALL KUABCLI_Subscribe(KUABCLIHANDLE hHandle, tagKUABPSControl *pstPSCtl, char *pszTopicExpr, char *pszFilterExpr);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_Unsubscribe(KUABCLIHANDLE hHandle, tagKUABPSControl *pstPSCtl);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_ReceivePublication(KUABCLIHANDLE hHandle, tagKUABPSControl *pstPSCtl, char *pszData, int nDataLen);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_RegisterPublisher(KUABCLIHANDLE hHandle, tagKUABPSControl *pstPSCtl, char *pszTopicExpr);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_DeregisterPublisher(KUABCLIHANDLE hHandle, tagKUABPSControl *pstPSCtl);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_Publish(KUABCLIHANDLE hHandle, tagKUABPSControl *pstPSCtl, char *pszTopicExpr, char *pszData, int nDataLen);

	/*broadcast/notify*/
	KUABCLI_API int KUABCLISTDCALL KUABCLI_Notify(KUABCLIHANDLE hHandle, char *szConnectionId, char *szData, int nDataLen, int nFlags);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_Broadcast(KUABCLIHANDLE hHandle, char *szMachineId, char *szUserName, char *szConnectionId, char *szData, int nDataLen, int nFlags);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_CheckUnsoliciety(KUABCLIHANDLE hHandle);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SetUnsoliciety(KUABCLIHANDLE hHandle);

	KUABCLI_API int KUABCLISTDCALL KUABCLI_SSLVerifyCertPasswd(KUABCLIHANDLE hHandle, char *szKeyFileName, char *szPassword);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SSLModifyCertPasswd(KUABCLIHANDLE hHandle, char *szKeyFileName, char *szOldPassword,char *szNewPassword);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SSLEncrypt(KUABCLIHANDLE hHandle, char *szKeyFileName, char *szPassword, unsigned char *pInput, int nInLen, unsigned char **pOutput, int *pnOutLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SSLDecrypt(KUABCLIHANDLE hHandle, char *szKeyFileName, char *szPassword, unsigned char *pInput, int nInLen, unsigned char **pOutput, int *pnOutLen);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_FreeMemory(KUABCLIHANDLE hHandle, void *memblock);
	KUABCLI_API int KUABCLISTDCALL KUABCLI_SSLGetCertInfo(KUABCLIHANDLE hHandle, char *szCertFileName, int nInfoType, int nInfoSubType, char *szBuf, int nLen);

#ifdef __cplusplus
}
#endif
#endif
